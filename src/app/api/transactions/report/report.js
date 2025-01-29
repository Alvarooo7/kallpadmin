import { NextResponse } from 'next/server';
import { connectDB } from '@/app/libs/mongodb';
import transaction from '@/app/models/transaction';

export async function generateReport(request) {
    console.log("== GENERATE REPORT");
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = parseInt(searchParams.get("offset")) || 0;
    const groupBy = searchParams.get("groupBy") || "daily"; // 'daily', 'weekly', 'monthly'
    const includeDetails = searchParams.get("details") === "true"; // Include transaction details

    // Establecer zona horaria para Perú (UTC-5)
    const peruTimezoneOffset = -5 * 60 * 60 * 1000;

    let startOfPeriod, endOfPeriod;
    if (!startDate && !endDate) {
        // Reporte del día actual
        const today = new Date(new Date().getTime() + peruTimezoneOffset);
        today.setUTCHours(0, 0, 0, 0);
        startOfPeriod = new Date(today);

        const end = new Date(today);
        end.setUTCHours(23, 59, 59, 999);
        endOfPeriod = new Date(end);
    } else {
        // Rango de fechas personalizado
        startOfPeriod = startDate ? new Date(new Date(startDate).getTime() + peruTimezoneOffset) : null;
        endOfPeriod = endDate ? new Date(new Date(endDate).getTime() + peruTimezoneOffset) : null;
    }

    // Crear filtro de fechas
    const dateFilter = {};
    if (startOfPeriod) dateFilter.$gte = startOfPeriod;
    if (endOfPeriod) dateFilter.$lte = endOfPeriod;

    const query = {
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    console.log("== QUERY", JSON.stringify(query));

    // Conectar a la base de datos
    await connectDB();

    // Generar reporte agrupado
    const periodGrouping = {
        daily: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        weekly: { $isoWeek: "$date" },
        monthly: { $dateToString: { format: "%Y-%m", date: "$date" } },
    };

    const report = await transaction.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    period: periodGrouping[groupBy] || periodGrouping.daily,
                    action: "$action",
                },
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.period": -1 } }, // Ordenar por periodo descendente
    ]);

    console.log("== REPORT", JSON.stringify(report));

    // Si se requiere incluir detalles, obtener transacciones paginadas
    let transactions = [];
    if (includeDetails) {
        transactions = await transaction
            .find(query)
            .skip(offset)
            .limit(limit)
            .sort({ date: -1 });
    }

    // Contar total de transacciones
    const totalTransactions = await transaction.countDocuments(query);

    return NextResponse.json(
        { totalTransactions, report, transactions },
        { status: 200 }
    );
}
