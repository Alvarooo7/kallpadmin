const { connectDB } = require("@/app/libs/mongodb");
import Course from "@/app/models/course";
import Enrollment from "@/app/models/enrollment";
import Students from "@/app/models/students";
import { generateCustomId, parseDate } from "@/app/utils/Utils";
import { NextResponse } from "next/server";


export async function GET(req) {
    await connectDB();

    // Leer los parámetros de consulta
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit')) || 5; // Valor predeterminado: 5
    const offset = parseInt(searchParams.get('offset')) || 0; // Valor predeterminado: 0
    const order = searchParams.get('order') || 'desc'; // Valor predeterminado: 'desc'
    const searchCode = searchParams.get('code') || '';  // Buscar por código
    const searchPhone = searchParams.get('phone') || ''; // Buscar por teléfono
    const searchName = searchParams.get('name') || '';  // Buscar por nombre

    // Validar el orden
    const sortOrder = order === 'asc' ? 1 : -1;

    // Construir la consulta de búsqueda
    const query = {
        $or: []
    };

    if (searchCode) {
        query.$or.push({ code: { $regex: searchCode, $options: 'i' } }); // Búsqueda por código (case-insensitive)
    }

    if (searchPhone) {
        query.$or.push({ phone: { $regex: searchPhone, $options: 'i' } }); // Búsqueda por teléfono (case-insensitive)
    }

    if (searchName) {
        // Descomponer el nombre en palabras clave
        const searchWords = searchName.split(' ').map(word => word.trim()).filter(Boolean);
        
        // Construir una consulta para buscar cada palabra del nombre
        query.name = { $all: searchWords.map(word => ({ $regex: word, $options: 'i' })) };
    }

    // Si no se proporcionaron parámetros de búsqueda, devolvemos todos los estudiantes
    if (query.$or.length === 0) {
        delete query.$or; // Eliminar el $or si no hay filtros
    }

    // Realizar la búsqueda en la base de datos
    const students = await Students.find(query)
        .sort({ createdAt: sortOrder }) // Ordenar por fecha de creación
        .skip(offset) // Aplicar desplazamiento
        .limit(limit); // Aplicar límite

    return NextResponse.json(students);
}

export async function POST(req) {
    try {
      await connectDB();
      const body = await req.json();

      // Imprimir todo el cuerpo del request para depuración
      console.log("===== Request Body =====");
      console.log(body);
      console.log("========================");
      const {
        course,
        name,
        phone,
        courseStartDay,
        age,
        parentName,
        parentPhone,
        level,
        courseEndDay,
        schedule,
        email,
        dni,
        amountCancelled,
        isMinor,
        haveToRegisterWithoutCapacity
      } = body;
  
      // Validar campos obligatorios
      if (!course || !name || !courseStartDay || !courseEndDay || (isMinor != null && age != null) || (!phone && !dni)) {
        return NextResponse.json(
          { message: "Campos obligatorios faltantes" },
          { status: 400 }
        );
      }
  
      // Verificar si el estudiante es menor de edad
      const isMinorStudent = isMinor || age < 18;
      let guardianId = null;
  
      if (isMinorStudent) {
        if (!parentName || !parentPhone) {
          return NextResponse.json(
            { message: "Se requiere parentName y parentPhone para menores de edad" },
            { status: 400 }
          );
        }
  
        // Buscar si ya existe un tutor con ese phone
        let guardian = await Students.findOne({ phone: parentPhone });
  
        if (!guardian) {
          // Crear el tutor
          guardian = await Students.create({
            code: generateCustomId(),
            name: parentName,
            phone: parentPhone,
            isMinor: false, // Los tutores no son menores de edad
          });
        }
        guardianId = guardian._id;
      }
  
      // Buscar si el estudiante ya existe
      let student = await Students.findOne({ phone: phone, name: name });
        // Buscar el curso
      const courseDoc = await Course.findOne({ name: course });
      if (!courseDoc) {
        return NextResponse.json({ message: "Curso no encontrado" }, { status: 404 });
      }

        // Validar aforo
      if (!haveToRegisterWithoutCapacity && courseDoc.capacity <= 0) {
         return NextResponse.json(
          { message: "No hay capacidad en este curso" },
          { status: 400 }
          );
     }
  
      if (!student) {
        // Crear el estudiante
        student = await Students.create({
          code: generateCustomId(),
          name,
          dni,
          phone,
          birthDate: age ? new Date(new Date().getFullYear() - age, 0, 1) : null,
          email,
          isMinor,
          guardian: guardianId || undefined,
        });
      }
  
      // Calcular el monto restante y el costo final
      const finalCost = amountCancelled >= courseDoc.cost ? courseDoc.cost : amountCancelled;
      const remainingAmount = courseDoc.cost - finalCost;
      console.log(finalCost)
      console.log(remainingAmount)

      // Registrar la inscripción
      const enrollment = await Enrollment.create({
        student: student._id,
        course: courseDoc._id,
        startDate: parseDate(courseStartDay),
        endDate: parseDate(courseEndDay),
        status: "active",
        cost: !!amountCancelled && amountCancelled > courseDoc.cost ? amountCancelled : courseDoc.cost,
        amountPaid: amountCancelled || courseDoc.cost,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0
      });
  
      // Reducir la capacidad del curso
      courseDoc.capacity -= 1;
      console.log('Capacidad: ' + courseDoc.capacity)

      await courseDoc.save();
  
      return NextResponse.json({ message: "Estudiante registrado con éxito", enrollment });
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Error al procesar la solicitud", error: error.message },
        { status: 500 }
      );
    }
  }

  export async function PATCH(req) {
    try {
      await connectDB();
      const body = await req.json();
  
      // Destructuramos el cuerpo de la solicitud
      const { studentCode , dni, courseCode, amountCancelled } = body;
  
      // Validar campos obligatorios
      if (!studentCode || amountCancelled === undefined) {
        return NextResponse.json(
          { message: "Faltan campos obligatorios" },
          { status: 400 }
        );
      }
  
      // Buscar el estudiante por code / DNI
      const student = await Students.findOne({ $or: [{ code: studentCode }, { dni: dni }] });
      if (!student) {
        return NextResponse.json(
          { message: "Estudiante no encontrado" },
          { status: 404 }
        );
      }
  
      // Buscar inscripciones activas del estudiante
      const enrollments = await Enrollment.find({
        student: student._id,
        status: "active"
      });
  
      // Si el estudiante tiene más de una inscripción activa, se debe especificar el código del curso
      if (enrollments.length > 1 && !courseCode) {
        return NextResponse.json(
          { message: "Debe especificar el código del curso" },
          { status: 400 }
        );
      }
  
      // Si el estudiante no tiene inscripciones activas
      if (enrollments.length === 0) {
        return NextResponse.json(
          { message: "No hay inscripciones activas para este estudiante" },
          { status: 404 }
        );
      }
  
      // Si solo tiene una inscripción activa, tomar el curso asociado
      let enrollment;
      if (enrollments.length === 1) {
        enrollment = enrollments[0];
      } else {
        // Si el estudiante tiene más de una inscripción activa, buscar la inscripción por código de curso
        enrollment = enrollments.find((enrollment) => enrollment.course.code === courseCode);
      }
  
      // Si no se encontró la inscripción con el código del curso especificado
      if (!enrollment && courseCode) {
        return NextResponse.json(
          { message: "Curso no encontrado en las inscripciones activas" },
          { status: 404 }
        );
      }
  
      // Buscar el curso de la inscripción
      const courseDoc = await Course.findById(enrollment.course);
  
      console.log(amountCancelled)
      console.log(courseDoc.cost)

      // Obtener los valores actuales de la inscripción desde la base de datos
      const { amountPaid: currentAmountPaid = 0, remainingAmount: currentRemainingAmount = courseDoc.cost } = enrollment;

      // Calcular el nuevo monto pagado acumulando el nuevo pago
      const updatedAmountPaid = currentAmountPaid + (amountCancelled || 0);

      // Calcular el nuevo monto restante considerando los pagos acumulados
      const updatedRemainingAmount = currentRemainingAmount - (amountCancelled || 0);

      // Asegurar que el monto restante no sea negativo
      const finalRemainingAmount = updatedRemainingAmount > 0 ? updatedRemainingAmount : 0;

      // Actualizar la inscripción con los valores calculados
      enrollment.amountPaid = updatedAmountPaid;
      enrollment.remainingAmount = finalRemainingAmount;

      // Guardar los cambios en la inscripción
      await enrollment.save();
  
      // Devolver la respuesta exitosa con la inscripción actualizada
      return NextResponse.json({ message: "Monto actualizado con éxito", enrollment });
  
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Error al procesar la solicitud, Intentar nuevamente", error: error.message },
        { status: 500 }
      );
    }
  }
  
  
/*
export async function POST(request) {
    await connectDB();
    const data = await request.json()
    if (!data.createdAt) {
        data.createdAt = new Date();
    }
    const students = Students.create(data);
    return NextResponse.json(students)
}
    */