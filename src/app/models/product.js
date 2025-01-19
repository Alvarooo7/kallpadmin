import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: true,
    unique: true, // Asegura que no haya duplicados para un tipo de producto
  },
  stock: {
    type: Number,
    required: true,
    default: 0, // El stock inicial puede ser cero
  },
  withoutStock: {
    type: Boolean,
    required: false,
    default: false, // El stock inicial puede ser cero
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Registro de la última actualización
  },
});

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);