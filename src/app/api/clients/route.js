const { connectDB } = require("@/app/libs/mongodb");
import Client from "@/app/models/client";
import { generateCode } from "@/app/utils/Utils";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB();
    const clients = await Client.find();
    return NextResponse.json(clients)
}

export async function POST(req) {
    try {
      await connectDB();
  
      // Obtener datos del cuerpo del request
      const { code, name, description, email, phone } = await req.json();
  
      // Validar datos requeridos
      if (!name || !phone || !code) {
        return new Response(
          JSON.stringify({ message: "Nombre, email y teléfono son obligatorios" }),
          { status: 400 }
        );
      }
  
      // Generar el código del entrenador
      //const code = generateCode();
  
      const newClient = new Client({
        name,
        description,
        email,
        phone,
        code,
      });
  
      await newClient.save();
  
      return new Response(
        JSON.stringify({ message: "Cliente creado exitosamente", client: newClient }),
        { status: 201 }
      );
    } catch (error) {
      console.error("Error al crear cliente:", error);
      return new Response(
        JSON.stringify({ message: "Error al cliente entrenador", error: error.message }),
        { status: 500 }
      );
    }
  }