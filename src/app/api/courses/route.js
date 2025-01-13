import { connectDB } from "@/app/libs/mongodb";
import Course from "@/app/models/course";
import TrainerCourseSchema from "@/app/models/trainerCourseSchema";
import Trainers from "@/app/models/trainers";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB();
    const course = await Course.find();
    return NextResponse.json(course)
}

export async function POST(request) {
    try {
        // Connect to the database
        await connectDB();

        // Parse the incoming request data
        const data = await request.json();
        
        // Extract the trainerCodes from the incoming data
  // Extract the trainerCodes and type from the incoming data
    const { trainerCodes, type, costPerHour, ...courseData } = data;

    // Validate that the type is one of the allowed values
    const validTypes = ['Natacion', 'Funcional', 'Paddle', 'Aguas Abiertas', 'Futbol', 'Taekwondo'];
    if (!validTypes.includes(type)) {
        return NextResponse.json(
            { message: `Invalid type. Valid types are: ${validTypes.join(', ')}` },
            { status: 400 }
        );
    }

  // Find trainers by their codes
    const trainers = await Trainers.find({ code: { $in: trainerCodes } });

    // Validate if all trainer codes are valid
    if (trainers.length !== trainerCodes.length) {
        return NextResponse.json(
            { message: 'Some trainer codes are invalid' },
            { status: 400 }
        );
    }

    // Extract the _id of each trainer
    const trainerIds = trainers.map(trainer => trainer._id);

    // Create the course with the trainer IDs and the valid type
    const newCourse = await Course.create({
        ...courseData,
        type, // Ensure that the valid type is included
        trainers: trainerIds
    });

    // Create TrainerCourse entries for each trainer associated with this course
    const trainerCourses = trainers.map(trainer => ({
        trainer: trainer._id,
        course: newCourse._id,
        costPerHour: costPerHour || 0 // Use provided costPerHour or default to 0
    }));

    // Insert TrainerCourse details into the database
    await TrainerCourseSchema.insertMany(trainerCourses);

        // Respond with the newly created course
    return NextResponse.json(newCourse, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: 'Error creating course', error: error.message },
            { status: 500 }
        );
    }
}