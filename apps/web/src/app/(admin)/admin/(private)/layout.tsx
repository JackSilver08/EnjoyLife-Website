import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {AdminShell} from "@/components/admin/admin-shell";

export default async function ProtectedAdmin({children}:Readonly<{children:React.ReactNode}>){
 const jar=await cookies();
 const response=await fetch((process.env.API_INTERNAL_URL??"http://localhost:8081")+"/api/v1/auth/me",{headers:{Cookie:jar.toString()},cache:"no-store"}).catch(()=>null);
 const data=response?.ok?await response.json():null;
 const user=data?.user;
 if(user?.role!=="ADMIN"&&user?.role!=="STAFF")redirect("/account");
 return <AdminShell name={user.name} role={user.role}>{children}</AdminShell>;
}
