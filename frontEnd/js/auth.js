//Elementos DOM
const authTitle = document.getElementById('authTitle');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const submitBtn = document.getElementById('submitBtn');
const footerText = document.getElementById('footerText');
const passwdErrorMsg = document.getElementById('passwdErrorMsg');
const userInput = document.getElementById('userInput');
const passwdInput = document.getElementById('passwdInput');
const loginErrorMsg = document.getElementById('loginErrorMsg');

// Campos específicos a ocultar/mostrar
const emailInput = document.getElementById('emailInput');
const emailLabel = document.getElementById('registroEmail');
const confirmInput = document.getElementById('passwdConfirmationInput');
const confirmLabel = document.getElementById('registroPasswd');


let isLogin = true;
renderLoginView();


toggleAuth.addEventListener("click", (e) =>{
    e.preventDefault();
    isLogin = !isLogin;

    if (isLogin) {
        renderLoginView();
    } else {
        renderRegisterView();
    }
})

function toggleVisibility(isLogin){

    const displayStyle = isLogin ? "none" : "block";

    emailInput.style.display = displayStyle;
    emailLabel.style.display = displayStyle;
    emailInput.required = isLogin; // Solo obligatorio si se ve

    // 2. Gestionamos la Confirmación de Contraseña
    confirmInput.style.display = displayStyle;
    confirmLabel.style.display = displayStyle;
    confirmInput.required = isLogin; // Solo obligatorio si se ve
    
    // 3. El mensaje de error siempre se esconde al cambiar de modo
    passwdErrorMsg.style.display = "none";
    loginErrorMsg.style.display = "none";
}

function renderLoginView() {
    authTitle.innerText = "Inicia sesión";
    submitBtn.innerText = "Continuar";
    footerText.innerText = "¿Aún no tienes una cuenta?";
    toggleAuth.innerText = "¡Regístrate!";
    toggleVisibility(true);
}

function renderRegisterView() {
    authTitle.innerText = "Crea tu cuenta en Loopware";
    submitBtn.innerText = "Registrarse";
    footerText.innerText = "¿Ya tienes cuenta?";
    toggleAuth.innerText = "Inicia sesión";
    toggleVisibility(false);
}

submitBtn.addEventListener("click", async (e) =>{
    if(isLogin){
        let loginOption = await checkLogin(userInput.value, passwdInput.value);
        if (loginOption) {
            window.location.href = '../index.html'
        } else {
            loginErrorMsg.style.display = displayStyle;
        }
    }else {
        let registerOption = createUser(userInput.value, emailInput.value, passwdInput.value);
        if (registerOption) {
            renderLoginView();
        }
    }
})

async function checkLogin(username, password) {
    const response = await fetch('http://localhost:3000/usuaris')
    const data = await response.json()

    const usuariTrobat = data.find(u => u.username == username)
    const usariCredentials = data.find(u => u.password == password)
    if (usuariTrobat == undefined && usariCredentials == undefined) {
        console.log("No s'ha trobat l'usuari")
        return false;
    } else {
        console.log("Benvingut "+ username)
        return true;
    }
}

function createUser(username, email, password) {

}



