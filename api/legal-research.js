import { openai } from "./_lib/openai.js";
import { checkLimit } from "./_lib/usage.js";

export default async function handler(req,res){

try{

const {query,userId,state} = req.body;

if(!checkLimit(userId,"legal")){

return res.status(429).json({
error:"Daily free limit reached"
});

}

const completion = await openai.chat.completions.create({

model:"gpt-4o-mini",

messages:[
{
role:"system",
content:"You are a legal research assistant. Explain laws clearly but do not give legal advice."
},
{
role:"user",
content:`Research this legal question in ${state || "United States"} law:\n\n${query}`
}
]

});

res.json({
result:completion.choices[0].message.content
});

}catch(e){

console.log(e);

res.status(500).json({
error:"Server error"
});

}
}
