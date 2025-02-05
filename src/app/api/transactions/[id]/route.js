import { NextResponse } from 'next/server';
import { connectDB } from '@/app/libs/mongodb';
import Transaction from '@/app/models/transaction';

export async function PATCH(request, { params }) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Parsear los datos del request
    const { id } = params; // Obtiene el ID desde la URL dinámica
    
    const rawBody = await request.text();
    const cleanedBody = rawBody
      .replace(/`/g, '') 
      .replace(/^\s*json\s*/i, '') 
      .trim();

    let data;
    try {
      data = await JSON.parse(cleanedBody);
    } catch (error) {
      return NextResponse.json(
        { message: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { amount, action, type, description, date, operation_number, payment_method, productType } = data;

    if (!id) {
      return NextResponse.json(
        { message: 'Se debe proporcionar el id de la transacción a actualizar.' },
        { status: 400 }
      );
    }

    // Buscar la transacción por id
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { message: 'No se encontró la transacción con ese id.' },
        { status: 404 }
      );
    }

    // Actualizar solo los campos proporcionados
    if (amount) transaction.amount = amount;
    if (action) transaction.action = action;
    if (type) transaction.type = type;
    if (description) transaction.description = description;
    if (date) transaction.date = new Date(date).toISOString();
    if (operation_number) transaction.operation_number = operation_number;
    if (payment_method) transaction.payment_method = payment_method;

    // Si hay un tipo de producto, actualizar el stock
    /*if (productType) {
      const product = await Product.findOne({ productType });
      if (product) {
        product.stock -= amount;
        await product.save();
      }
    }*/

    // Guardar los cambios
    await transaction.save();

    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Error actualizando la transacción', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {

try {
    const { id } = params; // Obtiene el ID desde la URL dinámica

    if (!id) {
      return NextResponse.json(
        { message: 'Se debe proporcionar un id válido para eliminar la transacción.' },
        { status: 400 }
      );
    }

    // Conectar a la base de datos
    await connectDB();

    // Buscar y eliminar la transacción
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return NextResponse.json(
        { message: 'No se encontró una transacción con ese id.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Transacción eliminada correctamente.', transaction: deletedTransaction },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Error al eliminar la transacción', error: error.message },
      { status: 500 }
    );
  }
}