/* authUI.js - Email + Password version */
var AuthUI=(function(){
"use strict";
var $=function(s){return document.querySelector(s);};

function showLogin(){$("#authOverlay").style.display="flex";}
function hideLogin(){$("#authOverlay").style.display="none";}

function renderUserBadge(user){
 var el=$("#userBadge");
 if(!el) return;
 if(!Auth.isEnabled()){el.innerHTML="Modo demo local";return;}
 if(!user){el.innerHTML="";return;}
 el.innerHTML='<span>'+user.email+'</span> <button id="logoutBtn">Cerrar sesión</button>';
 $("#logoutBtn").onclick=function(){Portfolio.flush();Auth.signOut();showLogin();};
}

function bindEvents(onLoggedIn){

 $("#authLogin").addEventListener("click",function(){
   var email=$("#authEmail").value.trim();
   var pass=$("#authPassword").value;
   var fb=$("#authFeedback");
   fb.textContent="Iniciando sesión...";
   Auth.signIn(email,pass).then(function(user){
      hideLogin();
      onLoggedIn(user);
   }).catch(function(err){
      fb.textContent=err.message||"Credenciales incorrectas.";
   });
 });

 $("#authRegister").addEventListener("click",function(){
   var email=$("#authEmail").value.trim();
   var pass=$("#authPassword").value;
   var fb=$("#authFeedback");
   fb.textContent="Creando cuenta...";
   Auth.signUp(email,pass).then(function(){
      fb.textContent="Cuenta creada. Ahora inicia sesión.";
   }).catch(function(err){
      fb.textContent=err.message;
   });
 });

 $("#forgotPassword").addEventListener("click",function(){
   var email=$("#authEmail").value.trim();
   var fb=$("#authFeedback");
   if(!email){fb.textContent="Ingresa tu correo.";return;}
   Auth.resetPassword(email).then(function(){
      fb.textContent="Se envió un correo para restablecer tu contraseña.";
   }).catch(function(err){fb.textContent=err.message;});
 });

 $("#authPassword").addEventListener("keydown",function(e){
   if(e.key==="Enter") $("#authLogin").click();
 });
}

return{
 showLogin:showLogin,
 hideLogin:hideLogin,
 renderUserBadge:renderUserBadge,
 bindEvents:bindEvents
};
})();