const r=require('express').Router();const c=require('../controllers/authController');r.get('/ingresar',c.loginForm);r.post('/ingresar',c.login);r.post('/salir',c.logout);module.exports=r;
