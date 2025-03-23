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
    const groupBy = searchParams.get("groupBy") || "daily";
    const includeDetails = searchParams.get("details") === "true";
    const includeBalance = searchParams.get("balance") === "true";
    const clientId = searchParams.get("clientId");

    if (!clientId) {
        return NextResponse.json(
          { message: 'El campo clientId es obligatorio.' },
          { status: 400 }
        );
    }

    const limaTimeZone = "America/Lima"; 

    // Obtener la fecha actual en la zona horaria de Lima
    const nowInLima = new Date(new Date().toLocaleString("en-US", { timeZone: limaTimeZone }));
    
    // Establecer la hora en medianoche (00:00:00) en Lima
    nowInLima.setHours(0, 0, 0, 0);
    
    // Convertir a UTC para hacer la consulta en la BD (MongoDB guarda en UTC)
    const today = new Date(nowInLima.getTime() + (5 * 60 * 60 * 1000));
    
    console.log("Lima midnight:", nowInLima.toISOString());
    console.log("UTC equivalent:", today.toISOString());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    console.log("Hoy (UTC):", today.toISOString());
    console.log(weekStart.toDateString())
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999));

    const query = {
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(clientId && { client_id: clientId })
    };

    console.log("== QUERY", JSON.stringify(query));

    await connectDB();

    const periodGrouping = {
        daily: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        weekly: { $dateToString: { format: "%Y-%U", date: "$date" } },
        monthly: { $dateToString: { format: "%Y-%m", date: "$date" } },
        yearly: { $dateToString: { format: "%Y", date: "$date" } },
    };

    const report = await transaction.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    period: periodGrouping[groupBy] || periodGrouping.daily,
                    action: "$action",
                    client_id: "$client_id",
                },
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.period": -1 } },
    ]);

    console.log("== REPORT", JSON.stringify(report));

    let balanceReport = [];
    if (includeBalance) {
        const balanceMap = {};
        report.forEach(({ _id, totalAmount }) => {
            const period = _id.period;
            const action = _id.action;
            const client = _id.client_id;

            if (!balanceMap[client]) {
                balanceMap[client] = {};
            }
            if (!balanceMap[client][period]) {
                balanceMap[client][period] = { income: 0, expense: 0, balance: 0 };
            }

            if (action === "INCOME") {
                balanceMap[client][period].income += totalAmount;
            } else if (action === "EXPENSE") {
                balanceMap[client][period].expense += totalAmount;
            }
        });

        balanceReport = Object.entries(balanceMap).flatMap(([clientId, periods]) =>
            Object.entries(periods).map(([period, { income, expense }]) => ({
                clientId,
                period,
                income,
                expense,
                balance: income - expense,
            }))
        );
    }

    let transactions = await transaction
        .find(query)
        .sort({ date: -1 });

    const totalTransactions = await transaction.countDocuments(query);

   // Cálculo del avance en el día y la semana
    
   const todayQuery = { client_id: clientId, date: { $gte: today } };
   const weekQuery = { client_id: clientId, date: { $gte: weekStart } };
   //const todayTransactions = await transaction.find(todayQuery).sort({ date: -1 });
   //const weekTransactions = await transaction.find(weekQuery).sort({ date: -1 });
   const todayReport = await transaction.aggregate([
       { $match: todayQuery },
       {
           $group: {
               _id: "$action",
               totalAmount: { $sum: "$amount" },
           },
       },
   ]);

   const weekReport = await transaction.aggregate([
       { $match: weekQuery },
       {
           $group: {
               _id: "$action",
               totalAmount: { $sum: "$amount" },
           },
       },
   ]);

   const todaySummary = {
       income: todayReport.find(r => r._id === "INCOME")?.totalAmount || 0,
       expense: todayReport.find(r => r._id === "EXPENSE")?.totalAmount || 0,
       balance: (todayReport.find(r => r._id === "INCOME")?.totalAmount || 0) - (todayReport.find(r => r._id === "EXPENSE")?.totalAmount || 0)
   };

   const weekSummary = {
       income: weekReport.find(r => r._id === "INCOME")?.totalAmount || 0,
       expense: weekReport.find(r => r._id === "EXPENSE")?.totalAmount || 0,
       balance: (weekReport.find(r => r._id === "INCOME")?.totalAmount || 0) - (weekReport.find(r => r._id === "EXPENSE")?.totalAmount || 0)
   };



    return NextResponse.json(
        { totalTransactions, report, balanceReport, todaySummary, weekSummary },
        { status: 200 }
    );
}