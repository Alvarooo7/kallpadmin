const { connectDB } = require("@/app/libs/mongodb");
import Trainer from "@/app/models/trainers";
import { generateCode } from "@/app/utils/Utils";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB();
    const trainers = await Trainer.find();
    return NextResponse.json(trainers)
}

export async function POST(req) {
    try {
      await connectDB();
  
      // Obtener datos del cuerpo del request
      const { name, description, email, phone } = await req.json();
  
      // Validar datos requeridos
      if (!name || !phone) {
        return new Response(
          JSON.stringify({ message: "Nombre, email y teléfono son obligatorios" }),
          { status: 400 }
        );
      }
  
      // Generar el código del entrenador
      const code = generateCode();
  
      // Crear el entrenador en la base de datos
      const newTrainer = new Trainer({
        name,
        description,
        email,
        phone,
        code,
      });
  
      await newTrainer.save();
  
      return new Response(
        JSON.stringify({ message: "Entrenador creado exitosamente", trainer: newTrainer }),
        { status: 201 }
      );
    } catch (error) {
      console.error("Error al crear entrenador:", error);
      return new Response(
        JSON.stringify({ message: "Error al crear entrenador", error: error.message }),
        { status: 500 }
      );
    }
  }