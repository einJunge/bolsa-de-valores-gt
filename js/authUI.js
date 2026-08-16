/* authUI.js - Email + Password version */
var AuthUI=(function(){
"use strict";
var $=function(s){return document.querySelector(s);};
function showLogin(){$("#authOverlay").style.display="flex";}
function hideLogin(){$("#authOverlay").style.display="none";}
 function keepLogoutLast(){
  var nav=$("#mainNav")||$("nav.main-nav");
  var logout=$("#logoutBtn");
  if(nav&&logout) nav.appendChild(logout);
 }
 function renderUserBadge(user){
 var el=$("#userBadge");
 var logout=$("#logoutBtn");
 keepLogoutLast();
 if(!el) return;
 if(!Auth.isEnabled()){
   el.innerHTML='<span class="user-mode-label">Modo demo local</span>';
   if(logout) logout.hidden=true;
   keepLogoutLast();
   return;
 }
 if(!user){
   el.innerHTML="";
   if(logout) logout.hidden=true;
   keepLogoutLast();
   return;
 }
 var email=user.email||"Usuario";
 var shortName=email.split("@")[0];
 el.innerHTML='<span class="user-email" title="'+email+'"><span class="user-email-full">'+email+'</span><span class="user-email-short">'+shortName+'</span></span>';
 if(logout){
   logout.hidden=false;
   logout.onclick=function(){
     logout.disabled=true;
     var flush=window.Portfolio&&Portfolio.isReady()?Promise.resolve(Portfolio.flush()).catch(function(){}):Promise.resolve();
     flush.then(function(){return Auth.signOut();});
   };
 }
 keepLogoutLast();
}
function bindEvents(onLoggedIn){
 $("#authLogin").addEventListener("click",function(){
   var email=$("#authEmail").value.trim();
   var pass=$("#authPassword").value;
   var fb=$("#authFeedback");
   fb.textContent="Iniciando sesión...";
   Auth.signIn(email,pass).then(function(user){hideLogin();onLoggedIn(user);}).catch(function(err){fb.textContent=err.message||"Credenciales incorrectas.";});
 });
 $("#authRegister").addEventListener("click",function(){
   var email=$("#authEmail").value.trim();
   var pass=$("#authPassword").value;
   var fb=$("#authFeedback");
   fb.textContent="Creando cuenta...";
   Auth.signUp(email,pass).then(function(){fb.textContent="Cuenta creada. Ahora inicia sesión.";}).catch(function(err){fb.textContent=err.message;});
 });
 $("#forgotPassword").addEventListener("click",function(){
   var email=$("#authEmail").value.trim();
   var fb=$("#authFeedback");
   if(!email){fb.textContent="Ingresa tu correo.";return;}
   Auth.resetPassword(email).then(function(){fb.textContent="Se envió un correo para restablecer tu contraseña.";}).catch(function(err){fb.textContent=err.message;});
 });
 $("#authPassword").addEventListener("keydown",function(e){if(e.key==="Enter") $("#authLogin").click();});
}
return{showLogin:showLogin,hideLogin:hideLogin,renderUserBadge:renderUserBadge,bindEvents:bindEvents};
})();