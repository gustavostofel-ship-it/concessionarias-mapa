import { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: 'Admin - Concessionárias',
};

export default function AdminPage() {
  return <AdminClient />;
}
