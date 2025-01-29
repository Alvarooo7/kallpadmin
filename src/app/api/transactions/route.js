import { NextResponse } from 'next/server';
import { connectDB } from '@/app/libs/mongodb';
import Transaction from '@/app/models/transaction';
import Product from '@/app/models/product';
import { generateReport } from './report/report';
import { getFilteredTransactions } from './report/filterTransactions';
//import { uploadImageToBlobStorage } from '@/utils/blobStorage'; // Implementa esta función para manejar el upload de imágenes.

export async function GET(req) {
  try {
    console.log(req)
    // Parsear los parámetros
    const { searchParams } = req.nextUrl;
    const mode = searchParams.get("mode") || "filter";

    if (mode === "report") {
      // Lógica para generar reporte diario
      return await generateReport(req);
    }

    // Lógica para filtrar transacciones
    const transactions = await getFilteredTransactions(req);
    return transactions;
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { message: "Error procesando la solicitud", error: error.message },
      { status: 500 }
    );
  }
};


export async function POST(request) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Parsear los datos del request
    const rawBody = await request.text();
    // Eliminar el prefijo 'json ' (si existe) y las comillas invertidas
    const cleanedBody = rawBody
    .replace(/`/g, '') // Elimina todas las comillas invertidas
    .replace(/^\s*json\s*/i, '') // Elimina el prefijo "json " al inicio (si existe)
    .trim(); // Elimina espacios adicionales al inicio y al final  

    let data;
    console.log(cleanedBody)
    try {
      data = await JSON.parse(cleanedBody);
    } catch (error) {
      // Si no es un JSON válido, devolver un error 400
      return NextResponse.json(
        { message: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }
    
    const { amount, action, type, description, date, operation_number, payment_method, image, productType } = data;

    // Validar los campos obligatorios
    if (!amount || !action || !type || !description) {
      return NextResponse.json(
        { message: 'Los campos amount, action, type, description y date son obligatorios.' },
        { status: 400 }
      );
    }

    // Validar formato de fecha y convertir a ISO
    const parsedDate = date ? new Date(date) : new Date();
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ message: 'El formato de fecha es inválido.' }, { status: 400 });
    }

    // Manejo opcional de stock
    if (productType) {
        // Intentar buscar el producto en el inventario
        const product = await Product.findOne({ productType });
  
        if (product) {
          // Actualizar el stock según la acción
            if (product.stock < amount) {
              console.warn(`ALERTA STOCK INSUFICIENTE ${productType}`)
              product.withoutStock = true;
            } else {
                product.withoutStock = false;
            }
            
            product.stock -= amount;
          }
  
          // Guardar los cambios en el producto
          await product.save();
        } else {
          // Si no se encuentra el producto, simplemente ignoramos la actualización del stock
          console.warn(`Producto no encontrado: ${productType}. Se ignora el manejo de stock.`);
        }

    // Subir imagen al servicio de almacenamiento externo (si se proporciona)
    /**let imageUrl = null;
    if (image) {
      try {
        imageUrl = await uploadImageToBlobStorage(image);
      } catch (error) {
        return NextResponse.json(
          { message: 'Error subiendo la imagen al almacenamiento externo.', error: error.message },
          { status: 500 }
        );
      }
    }**/

    // Crear la nueva transacción
    const newTransaction = await Transaction.create({
      amount,
      action,
      type,
      description,
      date: parsedDate.toISOString(), // Guardar fecha estandarizada en formato ISO.
      operation_number,
      payment_method,
      //image_url: imageUrl,
    });

    // Responder con la transacción creada
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Error creando la transacción', error: error.message },
      { status: 500 }
    );
  }
}
