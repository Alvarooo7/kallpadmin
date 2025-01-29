import { NextResponse } from 'next/server';
import { connectDB } from '@/app/libs/mongodb';
import Transaction from '@/app/models/transaction';

export async function getFilteredTransactions(req) {
  const { searchParams } = req.nextUrl;

  // Leer parámetros de consulta
  const limit = parseInt(searchParams.get("limit")) || 10; // Valor predeterminado: 10
  const offset = parseInt(searchParams.get("offset")) || 0; // Valor predeterminado: 0
  const order = searchParams.get("order") || "desc"; // Valor predeterminado: 'desc'
  const searchAction = searchParams.get("action") || ""; // Filtro por acción (income, expense)
  const searchType = searchParams.get("type") || ""; // Filtro por tipo
  const searchDescription = searchParams.get("description") || ""; // Filtro por descripción
  const startDate = searchParams.get("startDate"); // Fecha de inicio
  const endDate = searchParams.get("endDate"); // Fecha de fin

  // Validar el orden
  const sortOrder = order === "asc" ? 1 : -1;

  // Construir la consulta de búsqueda
  const query = {};

  if (searchAction) {
    query.action = searchAction;
  }

  if (searchType) {
    query.type = searchType;
  }

  if (searchDescription) {
    query.description = { $regex: searchDescription, $options: "i" }; // Búsqueda case-insensitive
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate); // Fecha de inicio
    }
    if (endDate) {
      query.date.$lte = new Date(endDate); // Fecha de fin
    }
  }

  await connectDB(); // Conexión a la base de datos

  // Obtener el total de elementos
  const totalItems = await Transaction.countDocuments(query);

  // Calcular total de páginas
  const totalPages = Math.ceil(totalItems / limit);

  // Realizar la búsqueda con paginación
  const transactions = await Transaction.find(query)
    .sort({ createdAt: sortOrder }) // Ordenar por fecha de creación
    .skip(offset) // Aplicar desplazamiento
    .limit(limit); // Aplicar límite

  // Construir la respuesta con metadatos de paginación
  const response = {
    data: transactions,
    pagination: {
      totalItems,
      limit,
      offset,
      totalPages,
      currentPage: Math.floor(offset / limit) + 1,
    },
  };

  return NextResponse.json(response);
}