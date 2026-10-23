package handlers

import (
 "context"
 "regexp"
 "strings"

 "github.com/jackc/pgx/v5"
)

var colorHexPattern=regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

type ProductColor struct {
 Name string `json:"name"`
 Hex string `json:"hex"`
 Group string `json:"group"`
 SwatchURL string `json:"swatch_url"`
}

func validColorMetadata(hex,group string)bool{
 return (hex==""||colorHexPattern.MatchString(hex))&&len(group)<=40
}

func validatedSizes(single string,multiple []string)([]string,bool){
 if len(multiple)==0{multiple=[]string{single}}
 if len(multiple)>12{return nil,false}
 seen:=map[string]bool{}
 sizes:=make([]string,0,len(multiple))
 for _,raw:=range multiple{
  size:=strings.TrimSpace(raw)
  key:=strings.ToUpper(size)
  if len(size)==0||len(size)>20||seen[key]{return nil,false}
  seen[key]=true
  sizes=append(sizes,size)
 }
 return sizes,true
}

func upsertProductColorway(ctx context.Context,tx pgx.Tx,productID,name,hex,group string)error{
 if group==""{group="Khác"}
 _,err:=tx.Exec(ctx,`INSERT INTO product_colorways(product_id,name,hex,color_group)
   VALUES($1,$2,$3,$4) ON CONFLICT(product_id,name) DO UPDATE SET
   hex=CASE WHEN EXCLUDED.hex<>'' THEN EXCLUDED.hex ELSE product_colorways.hex END,
   color_group=CASE WHEN EXCLUDED.hex<>'' OR EXCLUDED.color_group<>'Khác'
     THEN EXCLUDED.color_group ELSE product_colorways.color_group END`,
   productID,strings.TrimSpace(name),strings.ToUpper(hex),group)
 return err
}
