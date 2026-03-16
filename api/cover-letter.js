import { openai } from "./_lib/openai.js";
import { checkLimit } from "./_lib/usage.js";

export default async function handler(req,res){

try{

const {prompt,userId} = req.body;

if(!checkLimit(userId,"idea")){

return res.status(429).json({
error:"Daily free limit reached"
});

}

const completion = await openai.chat.completions.create({

model:"gpt-4o-mini",

messages:[
{
role:"system",
content:"Generate practical business or project ideas."
},
{
role:"user",
content:prompt
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
