// auth.js

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const logoutForm = document.querySelector("#logout-form");

function signUp() {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      alert("Signed up!");
    })
    .catch(error => {
      alert(error.message);
    });
}

function logIn() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      alert("Logged in!");
    })
    .catch(error => {
      alert(error.message);
    });
}

function logOut() {
  auth.signOut().then(() => {
    alert("Logged out!");
  });
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      alert(`Signed in as ${user.displayName}`);
    })
    .catch(error => {
      console.error(error);
      alert(error.message);
    });
}


// Show current user
auth.onAuthStateChanged(user => {
  const infoDiv = document.getElementById("user-info");
  if (user) {
    infoDiv.innerText = `Logged in as: ${user.email}`; 
    loginForm.style.display = "none";
    signupForm.style.display = "none";
    logoutForm.style.display = "flex"
  } else {
    infoDiv.innerText = "Not logged in."; 
    loginForm.style.display = "";
    signupForm.style.display = "";
    logoutForm.style.display = ""
  }
});

document.querySelector("#signup-link").addEventListener("click", () => {
  loginForm.style.display = "none";
  signupForm.style.display = "flex";
})

document.querySelector("#login-link").addEventListener("click", () => {
  signupForm.style.display = "none";
  loginForm.style.display = "flex";
})