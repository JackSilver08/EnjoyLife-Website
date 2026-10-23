// Browser proxy smoke test with no live OpenAI key or paid API calls.
const origin="http://127.0.0.1:3000";
const status=await fetch(origin+"/api/store/ai/status",{cache:"no-store"});
if(status.status!==200)throw Error("AI public configuration endpoint unavailable: "+status.status);
const config=await status.json();
if(config.configured!==false||typeof config.model!=="string"||config.model!=="gpt-4.1-mini"){
 throw Error("CI AI configuration must be missing and use supported default model: "+JSON.stringify(config));
}
const response=await fetch(origin+"/api/store/ai/customer",{
 method:"POST",headers:{"Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"},
 body:JSON.stringify({message:"Xin chào"}),
});
if(response.status!==503)throw Error("Disabled AI endpoint expected 503, got "+response.status);
const body=await response.json();
if(typeof body.error!=="string"||!body.error)throw Error("Disabled chatbot must explain configuration");
console.log("EnjoyLife chatbot BFF E2E PASSED: safe status, supported default model, disabled gateway and meaningful errors.");
