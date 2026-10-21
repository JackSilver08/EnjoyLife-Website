package handlers

import (
 "bytes"
 "encoding/json"
 "errors"
 "net/url"
 "regexp"
 "strings"
 "unicode/utf8"
)

var blogSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type blogInput struct {
 Slug string `json:"slug"`
 Title string `json:"title"`
 Excerpt string `json:"excerpt"`
 Content json.RawMessage `json:"content_json"`
 CategorySlug string `json:"category_slug"`
 TagSlugs []string `json:"tag_slugs"`
 CoverURL string `json:"cover_image_url"`
 CoverAlt string `json:"cover_image_alt"`
 SEOTitle string `json:"seo_title"`
 SEODescription string `json:"seo_description"`
 OGImageURL string `json:"og_image_url"`
 Status string `json:"status"`
 ExpectedVersion int `json:"expected_version"`
}

type blogArticle struct {
 ID string `json:"id"`
 Slug string `json:"slug"`
 Title string `json:"title"`
 Excerpt string `json:"excerpt"`
 CategorySlug string `json:"category_slug"`
 TagSlugs []string `json:"tag_slugs"`
 CoverURL string `json:"cover_image_url"`
 CoverAlt string `json:"cover_image_alt"`
 SEOTitle string `json:"seo_title"`
 SEODescription string `json:"seo_description"`
 OGImageURL string `json:"og_image_url"`
 Status string `json:"status"`
 Version int `json:"version"`
 AuthorID string `json:"author_id"`
 PublishedAt any `json:"published_at"`
 CreatedAt any `json:"created_at"`
 UpdatedAt any `json:"updated_at"`
 Content json.RawMessage `json:"content_json,omitempty"`
}

func validBlogSlug(s string, max int) bool {
 return len(s)>=2 && len(s)<=max && blogSlugPattern.MatchString(s)
}

func validBlogURL(s string) bool {
 if s=="" {return true}
 if len(s)>800 {return false}
 u,err:=url.Parse(s)
 return err==nil && u.Scheme=="https" && u.Host!="" && u.User==nil && u.Fragment==""
}

func validBlogDoc(doc json.RawMessage) bool {
 if len(doc)<2 || len(doc)>200_000 { return false }
 dec:=json.NewDecoder(bytes.NewReader(doc))
 var root map[string]json.RawMessage
 if err:=dec.Decode(&root);err!=nil {return false}
 if len(root)==0 {return false}
 var kind string
 if json.Unmarshal(root["type"],&kind)!=nil || kind!="doc" {return false}
 var content []json.RawMessage
 if err:=json.Unmarshal(root["content"],&content);err!=nil{return false}
 // Only structured JSON is accepted. HTML is never used as a serialization format.
 return len(content)<=200
}

func blogDocHasText(doc json.RawMessage) bool {
 var v any
 if json.Unmarshal(doc,&v)!=nil{return false}
 // The editor serializes text as objects with {"type":"text","text":"..."}.
 var walk func(any,int) int
 walk=func(value any,depth int)int{
  if depth>20{return 0}
  switch node:=value.(type){
  case map[string]any:
   if node["type"]=="text" {if text,ok:=node["text"].(string);ok {return utf8.RuneCountInString(strings.TrimSpace(text))}}
   count:=0
   if kids,ok:=node["content"];ok {count+=walk(kids,depth+1)}
   return count
  case []any:
   total:=0
   for _,item:=range node{total+=walk(item,depth+1)}
   return total
  }
  return 0
 }
 return walk(v,0)>=20
}

func normalizeBlogInput(in *blogInput) error {
 in.Slug=strings.ToLower(strings.TrimSpace(in.Slug))
 in.Title=strings.TrimSpace(in.Title)
 in.Excerpt=strings.TrimSpace(in.Excerpt)
 in.CategorySlug=strings.TrimSpace(in.CategorySlug)
 in.CoverURL=strings.TrimSpace(in.CoverURL)
 in.CoverAlt=strings.TrimSpace(in.CoverAlt)
 in.SEOTitle=strings.TrimSpace(in.SEOTitle)
 in.SEODescription=strings.TrimSpace(in.SEODescription)
 in.OGImageURL=strings.TrimSpace(in.OGImageURL)
 if in.Status=="" {in.Status="DRAFT"}
 if !validBlogSlug(in.Slug,140)||len(in.Slug)<3{return errors.New("Slug phải có 3–140 ký tự, chỉ gồm chữ thường, số và dấu gạch ngang.")}
 if utf8.RuneCountInString(in.Title)<3||utf8.RuneCountInString(in.Title)>180{return errors.New("Tiêu đề phải có 3–180 ký tự.")}
 if utf8.RuneCountInString(in.Excerpt)>450{return errors.New("Mô tả ngắn vượt 450 ký tự.")}
 if in.CategorySlug!=""&&!validBlogSlug(in.CategorySlug,80){return errors.New("Danh mục không hợp lệ.")}
 if utf8.RuneCountInString(in.CoverAlt)>200||utf8.RuneCountInString(in.SEOTitle)>70||utf8.RuneCountInString(in.SEODescription)>180{return errors.New("Trường SEO hoặc alt ảnh quá dài.")}
 if !validBlogURL(in.CoverURL)||!validBlogURL(in.OGImageURL){return errors.New("Hình ảnh phải là URL HTTPS hợp lệ.")}
 if in.CoverURL!=""&&in.CoverAlt==""{return errors.New("Ảnh bìa phải có mô tả alt.")}
 if !validBlogDoc(in.Content){return errors.New("Nội dung phải là JSON của trình soạn thảo với type=doc.")}
 if in.Status!="DRAFT"&&in.Status!="PUBLISHED"{return errors.New("Trạng thái phải là DRAFT hoặc PUBLISHED.")}
 if len(in.TagSlugs)>10{return errors.New("Tối đa 10 thẻ bài viết.")}
 seen:=make(map[string]bool)
 for i,t:=range in.TagSlugs {
  t=strings.TrimSpace(t)
  if !validBlogSlug(t,80)||seen[t]{return errors.New("Tag trùng hoặc không hợp lệ.")}
  seen[t]=true
  in.TagSlugs[i]=t
 }
 if in.Status=="PUBLISHED" {
  if utf8.RuneCountInString(in.Excerpt)<20||!blogDocHasText(in.Content){return errors.New("Bài xuất bản cần mô tả ít nhất 20 ký tự và nội dung tối thiểu 20 ký tự.")}
 }
 return nil
}
