import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {AdminShell} from "@/components/admin/admin-shell";
export default async function ProtectedAdmin({children}:Readonly<{children:React.ReactNode}>){
 const jar=await cookies();
 const response=await fetch((process.env.API_INTERNAL_URL??"http://localhost:8081")+"/api/v1/auth/me",{headers:{Cookie:jar.toString()},cache:"no-store"}).catch(()=>null);
 const data=response?.ok?await response.json():null;
 if(data?.user?.role!=="ADMIN")redirect("/admin/login");
 return <AdminShell name={data.user.name}>{children}</AdminShell>;
}
