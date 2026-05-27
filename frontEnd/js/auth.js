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
const nomInput = document.getElementById('userInput'); // También se usa para el nombre en registro

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
    emailInput.required = !isLogin; // Solo obligatorio en registro

    // 2. Gestionamos la Confirmación de Contraseña
    confirmInput.style.display = displayStyle;
    confirmLabel.style.display = displayStyle;
    confirmInput.required = !isLogin; // Solo obligatorio en registro
    
    // 3. El mensaje de error siempre se esconde al cambiar de modo
    passwdErrorMsg.style.display = "none";
    loginErrorMsg.style.display = "none";
}

function renderLoginView() {
    authTitle.innerText = "Inicia sesión";
    submitBtn.innerText = "Continuar";
    footerText.innerText = "¿Aún no tienes una cuenta?";
    toggleAuth.innerText = "¡Regístrate!";
    document.getElementById('loginName').innerText = "Email";
    toggleVisibility(true);
}

function renderRegisterView() {
    authTitle.innerText = "Crea tu cuenta en Loopware";
    submitBtn.innerText = "Registrarse";
    footerText.innerText = "¿Ya tienes cuenta?";
    toggleAuth.innerText = "Inicia sesión";
    document.getElementById('loginName').innerText = "Nombre completo";
    toggleVisibility(false);
}

submitBtn.addEventListener("click", async (e) =>{
    e.preventDefault();
    
    if(isLogin){
        let loginOption = await checkLogin(userInput.value, passwdInput.value);
        if (loginOption) {
            window.location.href = '../index.html'
        } else {
            loginErrorMsg.style.display = "block";
        }
    }else {
        // Verificar que las contraseñas coincidan
        if (passwdInput.value !== confirmInput.value) {
            passwdErrorMsg.style.display = "block";
            return;
        }
        passwdErrorMsg.style.display = "none";
        
        let registerOption = await createUser(userInput.value, emailInput.value, passwdInput.value);
        if (registerOption) {
            isLogin = true;
            renderLoginView();
            userInput.value = '';
            passwdInput.value = '';
            emailInput.value = '';
            confirmInput.value = '';
        } else {
            loginErrorMsg.style.display = "block";
        }
    }
})

async function checkLogin(email, password) {
    try {
        const response = await fetch('/login', {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, contrasenya: password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Guardar token en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            console.log("Bienvenido " + data.usuario.nom);
            return true;
        } else {
            console.log("Error al iniciar sesión: " + (data.error || 'desconocido'));
            return false;
        }
    } catch (err) {
        console.error("Error de conexión: " + err.message);
        return false;
    }
}

async function createUser(nom, email, password) {
    try {
        const response = await fetch('/registre', {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, email, contrasenya: password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log("Usuario creado correctamente");
            return true;
        } else {
            console.log("Error al crear usuario: " + (data.error || 'desconocido'));
            return false;
        }
    } catch (err) {
        console.error("Error de conexión: " + err.message);
        return false;
    }
}
