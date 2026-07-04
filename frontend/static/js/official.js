function sendMessage(){

let input=document.getElementById("chatInput");

let chat=document.getElementById("chatBox");

if(input.value.trim()=="")
return;

chat.innerHTML+=`

<div class="alert alert-success text-end">

${input.value}

</div>

`;

chat.innerHTML+=`

<div class="alert alert-secondary">

Thinking...

</div>

`;

input.value="";

chat.scrollTop=chat.scrollHeight;

}