import { mongoose } from "../index";
import { z } from "zod";

const employeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    employeeNumber: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    nationalId: { type: String, default: null },
    birthDate: { type: String, default: null }, // YYYY-MM-DD string
    hireDate: { type: String, required: true }, // YYYY-MM-DD string
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "branches", required: true },
    department: { type: String, required: true },
    jobTitle: { type: String, required: true },
    baseSalary: { type: Number, required: true },
    contractType: { type: String, required: true }, // full_time | part_time | temporary
    photoUrl: { type: String, default: null },
    status: { type: String, required: true, default: "active" }, // active | suspended | resigned
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const EmployeeModel =
  mongoose.models["employees"] ?? mongoose.model("employees", employeeSchema);

export const insertEmployeeSchema = z.object({
  fullName: z.string(),
  employeeNumber: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  hireDate: z.string(),
  branchId: z.string(),
  department: z.string(),
  jobTitle: z.string(),
  baseSalary: z.number(),
  contractType: z.string(),
  photoUrl: z.string().nullable().optional(),
  status: z.string().optional(),
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export interface Employee {
  id: string;
  fullName: string;
  employeeNumber: string;
  phone: string | null;
  address: string | null;
  nationalId: string | null;
  birthDate: string | null;
  hireDate: string;
  branchId: string;
  department: string;
  jobTitle: string;
  baseSalary: number;
  contractType: string;
  photoUrl: string | null;
  status: string;
  createdAt: Date;
}
