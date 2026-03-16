import { openai } from "./_lib/openai.js";
import { checkLimit } from "./_lib/usage.js";

export default async function handler(req,res){

try{

const {text,userId,tone} = req.body;

if(!checkLimit(userId,"email")){

return res.status(429).json({
error:"Daily free limit reached"
});

}

const completion = await openai.chat.completions.create({

model:"gpt-4o-mini",

messages:[
{
role:"system",
content:"You improve emails to sound clear, professional and natural."
},
{
role:"user",
content:`Rewrite this email in a ${tone} tone:\n\n${text}`
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
