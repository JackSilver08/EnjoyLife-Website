package handlers

import (
 "strings"
 "unicode/utf8"
 "net/http"
 "github.com/gin-gonic/gin"
)

type siteContent struct{
 HeroImage string `json:"hero_image_url"`
 HeroEyebrow string `json:"hero_eyebrow"`
 HeroTitle string `json:"hero_title"`
 HeroEmphasis string `json:"hero_emphasis"`
 StoryImage string `json:"story_image_url"`
 StoryEyebrow string `json:"story_eyebrow"`
 StoryTitle string `json:"story_title"`
 StoryEmphasis string `json:"story_emphasis"`
 StoryP1 string `json:"story_p1"`
 StoryP2 string `json:"story_p2"`
}
func(a *App) siteContentGet(c *gin.Context){
 var s siteContent
 err:=a.DB.QueryRow(c.Request.Context(),`SELECT hero_image_url,hero_eyebrow,hero_title,hero_emphasis,
 story_image_url,story_eyebrow,story_title,story_emphasis,story_p1,story_p2 FROM site_content WHERE id=1`).Scan(
 &s.HeroImage,&s.HeroEyebrow,&s.HeroTitle,&s.HeroEmphasis,&s.StoryImage,&s.StoryEyebrow,&s.StoryTitle,&s.StoryEmphasis,&s.StoryP1,&s.StoryP2)
 if err!=nil{serverError(c,err);return}
 c.JSON(http.StatusOK,s)
}
func(a *App) adminSiteContentPut(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var s siteContent
 if c.ShouldBindJSON(&s)!=nil{c.JSON(400,gin.H{"error":"Dữ liệu trang chủ không hợp lệ."});return}
 fields:=[]string{s.HeroEyebrow,s.HeroTitle,s.HeroEmphasis,s.StoryEyebrow,s.StoryTitle,s.StoryEmphasis,s.StoryP1,s.StoryP2}
 for _,v:=range fields{
  if strings.ContainsAny(v,"<>")||utf8.RuneCountInString(v)>1600{c.JSON(400,gin.H{"error":"Nội dung vượt giới hạn hoặc chứa ký tự không hợp lệ."});return}
 }
 if len(strings.TrimSpace(s.HeroTitle))<3||len(strings.TrimSpace(s.StoryTitle))<3||len(s.StoryP1)<5||!validManagedImageURL(s.HeroImage)||!validManagedImageURL(s.StoryImage){
  c.JSON(400,gin.H{"error":"Cần tiêu đề, câu chuyện và ảnh từ thư viện Enjoy Life."});return
 }
 _,err:=a.DB.Exec(c.Request.Context(),`UPDATE site_content SET
 hero_image_url=$1,hero_eyebrow=$2,hero_title=$3,hero_emphasis=$4,
 story_image_url=$5,story_eyebrow=$6,story_title=$7,story_emphasis=$8,story_p1=$9,story_p2=$10,updated_at=now() WHERE id=1`,
 s.HeroImage,s.HeroEyebrow,s.HeroTitle,s.HeroEmphasis,s.StoryImage,s.StoryEyebrow,s.StoryTitle,s.StoryEmphasis,s.StoryP1,s.StoryP2)
 if err!=nil{serverError(c,err);return}
 _,err = a.DB.Exec(c.Request.Context(),`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'SITE_CONTENT_EDIT','homepage','Hero and Story updated')`,actor.ID)
 if err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok"})
}
