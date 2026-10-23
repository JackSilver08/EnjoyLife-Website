"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback} from "@/components/admin/admin-toast";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";

type Supplier={id:string;name:string;contact:string;lead_days:number;active:boolean};
type Stock={variant_id:string;sku:string;name:string;color:string;size:string;active:boolean;archived:boolean;on_hand:number;unavailable:number};
type Purchase={id:string;po_no:string;supplier:string;status:string;note:string;expected_date:string;quantity:number;received:number;created_at:string};
type Item={id:string;variant_id:string;name:string;sku:string;color:string;size:string;quantity:number;received:number;remaining:number;unit_cost_vnd:number};
type Detail={id:string;po_no:string;status:string;supplier:string;note:string;expected_date:string;items:Item[]};
const labels:Record<string,string>={ORDERED:"Đã đặt",PARTIAL:"Đã nhận một phần",RECEIVED:"Nhận đủ",CANCELLED:"Đã hủy"};

export default function WarehouseOperations(){
 const suppliers=useAdminData<{items:Supplier[]}>("admin/warehouse/suppliers");
 const inventory=useAdminData<{items:Stock[]}>("admin/inventory");
 const purchases=useAdminData<{items:Purchase[]}>("admin/warehouse/purchases");
 const [supplierOpen,setSupplierOpen]=useState(false);
 const [purchaseOpen,setPurchaseOpen]=useState(false);
 const [supplierName,setSupplierName]=useState("");
 const [supplierContact,setSupplierContact]=useState("");
 const [leadDays,setLeadDays]=useState(7);
 const [selectedSupplier,setSelectedSupplier]=useState("");
 const [variant,setVariant]=useState("");
 const [qty,setQty]=useState(1);
 const [cost,setCost]=useState("");
 const [expected,setExpected]=useState("");
 const [note,setNote]=useState("");
 const [lines,setLines]=useState<{variant_id:string;quantity:number;unit_cost_vnd:number;label:string}[]>([]);
 const [chosen,setChosen]=useState("");
 const [detail,setDetail]=useState<Detail|null>(null);
 const [receiving,setReceiving]=useState<Record<string,{accepted:string;quarantined:string}>>({});
 const [receiptNote,setReceiptNote]=useState("");
 const [working,setWorking]=useState(false);
 const [feedback,setFeedback]=useState("");
 const key=useRef<string|null>(null);
 const availableVariants=(inventory.data?.items??[]).filter(x=>!x.archived&&x.active);
 useEffect(()=>{
  if(!chosen){return}
  let live=true;
  fetch("/api/store/admin/warehouse/purchases/"+chosen,{cache:"no-store"}).then(async response=>{
   const json=await response.json();if(!response.ok)throw new Error(json.error||"Không đọc được phiếu nhập");
   if(live){setDetail(json);setReceiving({})}
  }).catch(err=>{if(live)setFeedback(err instanceof Error?err.message:"Không đọc được phiếu")});
  return()=>{live=false}
 },[chosen,purchases.data]);
 async function createSupplier(e:FormEvent){
  e.preventDefault();setWorking(true);setFeedback("");
  try{await adminAction("admin/warehouse/suppliers","POST",{name:supplierName,contact:supplierContact,lead_days:leadDays});setSupplierName("");setSupplierContact("");await suppliers.reload();setSupplierOpen(false);setFeedback("Đã thêm nhà cung cấp.")}
  catch(err){setFeedback(err instanceof Error?err.message:"Không thể thêm nhà cung cấp.")}
  finally{setWorking(false)}
 }
 function addLine(){
  const x=availableVariants.find(item=>item.variant_id===variant);
  const price=Number(cost);
  if(!x||!Number.isSafeInteger(qty)||qty<=0||qty>10000||!Number.isSafeInteger(price)||price<=0||lines.some(i=>i.variant_id===variant)){
   setFeedback("Chọn SKU chưa thêm, số lượng và giá vốn VND hợp lệ.");return
  }
  setLines(v=>[...v,{variant_id:variant,quantity:qty,unit_cost_vnd:price,label:x.name+" · "+x.color+"/"+x.size+" · "+x.sku}]);
  setFeedback("");setVariant("");setCost("");setQty(1)
 }
 async function createPurchase(e:FormEvent){
  e.preventDefault();setWorking(true);setFeedback("");
  try{
   const result=await adminAction("admin/warehouse/purchases","POST",{
    supplier_id:selectedSupplier,expected_date:expected,note,
    items:lines.map(({variant_id,quantity,unit_cost_vnd})=>({variant_id,quantity,unit_cost_vnd}))
   });
   setLines([]);setExpected("");setNote("");await purchases.reload();setPurchaseOpen(false);setChosen(result.id);
   setFeedback("Đã tạo phiếu "+result.po_no+". Hàng chưa được cộng tồn cho đến khi nhận thực tế.")
  }catch(err){setFeedback(err instanceof Error?err.message:"Không tạo được phiếu đặt nhập.")}
  finally{setWorking(false)}
 }
 async function receive(){
  if(!detail)return;
  const rows=detail.items.map(item=>({item_id:item.id,
   accepted:Number(receiving[item.id]?.accepted||0),
   quarantined:Number(receiving[item.id]?.quarantined||0)
  })).filter(i=>i.accepted+i.quarantined>0);
  if(!rows.length||rows.some(r=>!Number.isSafeInteger(r.accepted)||!Number.isSafeInteger(r.quarantined)||r.accepted<0||r.quarantined<0)){
   setFeedback("Nhập số lượng đạt hoặc hàng cách ly hợp lệ.");return
  }
  // Keep the SAME request key on network errors; double clicks cannot double-credit stock.
  if(!key.current)key.current=crypto.randomUUID();
  setWorking(true);setFeedback("");
  try{
   const result=await adminAction("admin/warehouse/purchases/"+detail.id+"/receipts","POST",{
    request_key:key.current,note:receiptNote,lines:rows
   });
   key.current=null;setReceiving({});setReceiptNote("");
   await Promise.all([purchases.reload(),inventory.reload()]);
   setFeedback(result.idempotent?"Yêu cầu này đã được ghi nhận trước đó. Không cộng kho lần hai.":"Đã nhận hàng. Hàng cách ly chưa được phép bán.")
  }catch(err){setFeedback(err instanceof Error?err.message:"Không nhận được hàng.")}
  finally{setWorking(false)}
 }
 async function cancelPurchase(){
  if(!detail||!window.confirm("Hủy phiếu chưa nhận hàng "+detail.po_no+"?"))return;
  setWorking(true);setFeedback("");
  try{await adminAction("admin/warehouse/purchases/"+detail.id+"/cancel","POST");await purchases.reload();setFeedback("Đã hủy phiếu đặt nhập chưa nhận hàng.")}
  catch(err){setFeedback(err instanceof Error?err.message:"Không thể hủy phiếu.")}
  finally{setWorking(false)}
 }
 return <><span className="eyebrow">SPRINT 9 / NGHIỆP VỤ KHO THỜI TRANG</span><h1>Nhập hàng & nhà cung cấp</h1>
 <p className="admin-subtitle">Tạo đơn đặt nhập, nhận theo từng SKU/màu/size, phân loại hàng đạt và hàng cách ly. Chỉ hàng đã nhận thực tế mới được cộng kho.</p>
 <div className="admin-toolbar"><button type="button" onClick={()=>{void suppliers.reload();void purchases.reload();void inventory.reload()}}>Làm mới dữ liệu</button><Link href="/admin/inventory">Tồn kho chi tiết ↗</Link><Link href="/admin/warehouse/insights">Phân tích & danh sách chờ ↗</Link></div>
 <AdminFeedback message={feedback} error={suppliers.error||purchases.error||inventory.error}/>
 <div className="admin-toolbar"><button type="button" onClick={()=>setSupplierOpen(true)}>+ Nhà cung cấp</button><button type="button" className="button-dark" onClick={()=>setPurchaseOpen(true)}>+ Lập phiếu nhập</button></div>
 <div className="warehouse-grid">
  <section className="admin-surface"><h2>Nhà cung cấp</h2>
   {supplierOpen&&<AdminModal title="Thêm nhà cung cấp" subtitle="Lưu thông tin và thời gian giao hàng dự kiến." onClose={()=>!working&&setSupplierOpen(false)} busy={working}><form onSubmit={e=>void createSupplier(e)} className="warehouse-form">
    <label>Tên nhà cung cấp<input required minLength={2} maxLength={120} value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="Ví dụ: Xưởng may A"/></label>
    <label>Liên hệ (nội bộ)<input maxLength={150} value={supplierContact} onChange={e=>setSupplierContact(e.target.value)} placeholder="Số điện thoại hoặc email"/></label>
    <label>Số ngày nhập hàng dự kiến<input required type="number" min={1} max={365} value={leadDays} onChange={e=>setLeadDays(Number(e.target.value))}/></label>
    <button className="button-dark" disabled={working} type="submit">Lưu nhà cung cấp</button>
   </form></AdminModal>}
   <div className="warehouse-supplier-list">{suppliers.data?.items.map(s=><div key={s.id}><strong>{s.name}</strong><small>Nhập hàng khoảng {s.lead_days} ngày</small></div>)}</div>
  </section>
  {purchaseOpen&&<AdminModal title="Lập phiếu đặt nhập" subtitle="Chọn nhà cung cấp, nhiều biến thể và giá vốn từng SKU." onClose={()=>!working&&setPurchaseOpen(false)} busy={working} wide><section className="admin-surface"><h2>Lập phiếu đặt nhập</h2>
   <form className="warehouse-form" onSubmit={e=>void createPurchase(e)}>
    <label>Nhà cung cấp<select required value={selectedSupplier} onChange={e=>setSelectedSupplier(e.target.value)}><option value="">Chọn nhà cung cấp</option>{suppliers.data?.items.filter(s=>s.active).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
    <label>Ngày dự kiến nhận hàng<input type="date" value={expected} onChange={e=>setExpected(e.target.value)}/></label>
    <label>SKU / màu / size<select value={variant} onChange={e=>setVariant(e.target.value)}><option value="">Chọn mã hàng</option>{availableVariants.map(i=><option value={i.variant_id} key={i.variant_id}>{i.sku} · {i.name} · {i.color}/{i.size}</option>)}</select></label>
    <div className="warehouse-fields"><label>Số lượng<input type="number" min={1} max={10000} value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><label>Giá vốn/chiếc (VND)<input type="number" min={1} value={cost} onChange={e=>setCost(e.target.value)}/></label></div>
    <button type="button" onClick={addLine}>+ Thêm SKU vào phiếu</button>
    {lines.map(line=><div key={line.variant_id} className="warehouse-line"><span>{line.label} · {line.quantity} chiếc · {moneyVND(line.unit_cost_vnd)}/chiếc</span><button type="button" onClick={()=>setLines(lines.filter(i=>i.variant_id!==line.variant_id))}>Xóa</button></div>)}
    <label>Ghi chú<input maxLength={300} value={note} onChange={e=>setNote(e.target.value)}/></label>
    <button className="button-dark" type="submit" disabled={!selectedSupplier||!lines.length||working}>Tạo phiếu đặt nhập</button>
   </form>
  </section></AdminModal>}
 </div>
 <section className="admin-surface"><h2>Danh sách phiếu nhập</h2>
 {purchases.loading?<p>Đang tải phiếu...</p>:!purchases.data?.items.length?<p>Chưa có phiếu nhập.</p>:
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã phiếu</th><th>Nhà cung cấp</th><th>Tiến độ</th><th>Nhận hàng</th></tr></thead><tbody>{purchases.data.items.map(p=><tr key={p.id}><td><strong>{p.po_no}</strong><small>{p.expected_date&&"Dự kiến: "+p.expected_date}</small></td><td>{p.supplier}</td><td>{p.received}/{p.quantity} · {labels[p.status]||p.status}</td><td><button type="button" onClick={()=>{if(chosen===p.id){void purchases.reload()}else{setChosen(p.id);setDetail(null);key.current=null}}}>{chosen===p.id?"Đang chọn":"Xem / nhận"}</button></td></tr>)}</tbody></table></div>}
 </section>
 {chosen&&<AdminModal title={"Chi tiết phiếu nhập"} subtitle="Xác nhận số lượng thực nhận và cách ly hàng lỗi." onClose={()=>!working&&setChosen("")} busy={working} wide><section className="admin-surface">
  {!detail?<p>Đang tải chi tiết phiếu...</p>:<>
   <h2>Nhận hàng — {detail.po_no}</h2>
   <p className="admin-subtitle">{detail.supplier} · {labels[detail.status]||detail.status}. Số hàng lỗi sẽ vào khu cách ly, không thể bán.</p>
   <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã hàng</th><th>Đặt / Đã nhận</th><th>Đạt</th><th>Cách ly</th></tr></thead><tbody>{detail.items.map(i=><tr key={i.id}><td>{i.sku} · {i.name}<small>{i.color} / {i.size}</small></td><td>{i.quantity} / {i.received} (còn {i.remaining})</td><td><input aria-label={"Đạt "+i.sku} type="number" min={0} max={i.remaining} disabled={i.remaining===0} value={receiving[i.id]?.accepted??""} onChange={e=>setReceiving(v=>({...v,[i.id]:{accepted:e.target.value,quarantined:v[i.id]?.quarantined??""}}))}/></td><td><input aria-label={"Cách ly "+i.sku} type="number" min={0} max={i.remaining} disabled={i.remaining===0} value={receiving[i.id]?.quarantined??""} onChange={e=>setReceiving(v=>({...v,[i.id]:{accepted:v[i.id]?.accepted??"",quarantined:e.target.value}}))}/></td></tr>)}</tbody></table></div>
   {detail.status!=="RECEIVED"&&detail.status!=="CANCELLED"&&<div className="warehouse-form">
    <label>Biên bản nhận hàng<input value={receiptNote} maxLength={300} onChange={e=>setReceiptNote(e.target.value)} placeholder="Kiểm màu, size, lỗi chỉ may..."/></label>
    <button className="button-dark" disabled={working} onClick={()=>void receive()} type="button">Xác nhận nhận hàng thực tế</button>
    {detail.status==="ORDERED"&&<button type="button" disabled={working} onClick={()=>void cancelPurchase()}>Hủy phiếu chưa nhận</button>}
   </div>}
  </>}
 </section></AdminModal>}
 <p className="admin-help">Lưu ý: chưa tích hợp gửi đơn mua tới nhà cung cấp; phiếu này là chứng từ nội bộ. Giá vốn được ghi theo dòng đặt nhập để làm nền tảng tính lợi nhuận sau này.</p>
 </>;
}
