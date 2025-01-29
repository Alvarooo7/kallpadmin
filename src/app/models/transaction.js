import mongoose from "mongoose";
import { PaymentMethod, TransactionAction, TransactionType } from "./transactionEnums";

const transaction = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  action: {
    type: String,
    enum: Object.values(TransactionAction), // Define los valores permitidos
    required: true,
  },
  type: {
    type: String,
    //enum: Object.values(TransactionType),
    default: TransactionType.OTHER,
    required: true,
  },
  description: {
    type: String,
    required: false, // No obligatorio, pero puedes cambiarlo a true si es necesario
  },
  operation_number: {
    type: String,
    required: false,
  },
  payment_method: {
    type: String,
    enum: Object.values(PaymentMethod),
    default: PaymentMethod.YAPE // Métodos de pago permitidos
  },
  date: {
    type: Date,
    default: Date.now, // Fecha de la transacción
  },
  image_url: {
    type: String, // URL de la imagen asociada
    required: false,
  },
}, {
  timestamps: true, // Agrega campos `createdAt` y `updatedAt`
});
export default mongoose.models.Transaction || mongoose.model("Transaction", transaction);
