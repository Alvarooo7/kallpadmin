import { parse, format } from "date-fns";
import es from "date-fns/locale/es";

export function generateTrxCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
}

export function generateCustomId() {
    const prefix = "KLP";
    const randomNumbers = Math.floor(100000 + Math.random() * 900000); // Genera un número aleatorio de 6 dígitos
    return `${prefix}${randomNumbers}`;
}

export function generateCode() {
    const prefix = "TRAI";
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 caracteres alfanuméricos
    return `${prefix}${randomSuffix}`;
  }

export const parseDate = (input) => {
  const formats = [
    "EEEE d 'de' MMMM",      // lunes 16 de diciembre
    "d 'de' MMMM",           // 16 de diciembre
    "dd/MM/yyyy",            // 16/12/2025
    "dd-MM-yyyy",            // 16-12-2025
  ];

  let parsedDate = null;

  for (const formatStr of formats) {
    try {
      parsedDate = parse(input, formatStr, new Date(), { locale: es });
      // Validar que la fecha sea válida
      if (!isNaN(parsedDate)) break;
    } catch (error) {
      // Continúa intentando con otros formatos
    }
  }

  if (!parsedDate || isNaN(parsedDate)) {
    throw new Error(`Formato de fecha no reconocido: ${input}`);
  }

  return parsedDate;  // Devuelve un objeto Date
};
