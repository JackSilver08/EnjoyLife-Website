export type ColorChoice={name:string;hex:string;group:string};
export const PRODUCT_COLORS:ColorChoice[]=[
 {name:"Trắng",hex:"#F5F4EF",group:"Trắng"},
 {name:"Đen",hex:"#292A2A",group:"Đen"},
 {name:"Kem",hex:"#E8DAC5",group:"Be"},
 {name:"Be",hex:"#CBB99B",group:"Be"},
 {name:"Nâu",hex:"#80604C",group:"Nâu"},
 {name:"Xanh rêu",hex:"#647459",group:"Xanh lá"},
 {name:"Xanh navy",hex:"#30445E",group:"Xanh dương"},
 {name:"Xám",hex:"#94989A",group:"Xám"},
 {name:"Đỏ",hex:"#AD4D49",group:"Đỏ"},
 {name:"Hồng",hex:"#D7A0A9",group:"Hồng"},
 {name:"Xanh dương",hex:"#7194B9",group:"Xanh dương"},
 {name:"Vàng",hex:"#D4B25C",group:"Vàng"}
];
export const COLOR_GROUPS=["Trắng","Đen","Be","Nâu","Xám","Xanh lá","Xanh dương","Đỏ","Hồng","Vàng","Khác"] as const;
export const isColorHex=(x:string)=>/^#[0-9a-fA-F]{6}$/.test(x);
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("vi-VN").trim();
export function presetForColor(name:string){return PRODUCT_COLORS.find(x=>normalize(x.name)===normalize(name))}
export function visualColor(name:string,hex?:string):string|null{
 if(hex&&isColorHex(hex))return hex;
 return presetForColor(name)?.hex??null;
}
