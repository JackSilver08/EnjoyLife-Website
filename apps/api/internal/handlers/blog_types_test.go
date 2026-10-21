package handlers

import (
 "encoding/json"
 "testing"
)

func TestBlogValidation(t *testing.T){
 good:=json.RawMessage(`{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Phong cách"}]},{"type":"paragraph","content":[{"type":"text","text":"Hãy chọn món đồ mà bạn yêu thích.","marks":[{"type":"bold"}]}]}]}`)
 if !validBlogDoc(good){t.Fatal("valid editor document rejected")}
 for _,raw:=range []string{
  `{"type":"doc","content":[{"type":"html","html":"<script>alert(1)</script>"}]}`,
  `{"type":"doc","content":[{"type":"image","attrs":{"src":"javascript:alert(1)","alt":"bad"}}]}`,
  `{"type":"doc","content":[{"type":"text","text":"open","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}`,
  `{"type":"doc","content":[{"type":"paragraph","attrs":{"onclick":"evil()"}}]}`,
 }{
  if validBlogDoc(json.RawMessage(raw)){t.Fatalf("accepted unsafe blog doc: %s",raw)}
 }
 input:=blogInput{
  Slug:"sample-article",Title:"Một bài viết",Excerpt:"Mô tả bài viết hợp lệ cho tác giả.",
  Content:good,Status:"PUBLISHED",
 }
 if err:=normalizeBlogInput(&input);err!=nil{t.Fatal(err)}
 input.CoverURL="javascript:alert(1)"
 if err:=normalizeBlogInput(&input);err==nil{t.Fatal("unsafe cover URL accepted")}
}
