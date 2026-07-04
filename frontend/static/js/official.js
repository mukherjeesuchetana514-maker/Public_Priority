async function sendMessage(){

let input=document.getElementById("chatInput");

let chat=document.getElementById("chatBox");

let msg=input.value.trim();

if(msg=="") return;

chat.innerHTML+=`

<div class="alert alert-success text-end">

${msg}

</div>

`;

input.value="";

chat.innerHTML+=`

<div class="alert alert-secondary" id="typing">

Thinking...

</div>

`;

chat.scrollTop=chat.scrollHeight;

try{

let response=await fetch("http://127.0.0.1:5000/api/chat",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

message:msg

})

});

let data=await response.json();

document.getElementById("typing").remove();

chat.innerHTML+=`

<div class="alert alert-primary">

${data.reply}

</div>

`;

chat.scrollTop=chat.scrollHeight;

}

catch(err){

document.getElementById("typing").remove();

chat.innerHTML+=`

<div class="alert alert-danger">

Server Error

</div>

`;

}

}