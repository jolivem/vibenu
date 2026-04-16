# 🐘 PostgreSQL dans WSL (Ubuntu)

Ce guide résume les commandes essentielles pour installer et utiliser PostgreSQL dans WSL (Ubuntu).

---

## 📦 Installation

Mettre à jour le système :

```bash
sudo apt update && sudo apt upgrade -y
```

Installer PostgreSQL :

```bash
sudo apt install postgresql postgresql-contrib -y
```

---

## ▶️ Démarrer PostgreSQL

```bash
sudo service postgresql start
```

---

## 👤 Accès à PostgreSQL

Se connecter avec l'utilisateur `postgres` :

```bash
sudo -i -u postgres
psql
```

---

## 🛠️ Commandes SQL utiles

### Créer une base de données

```sql
CREATE DATABASE ma_bdd;
```

### Créer un utilisateur

```sql
CREATE USER mon_user WITH PASSWORD 'motdepasse';
```

### Donner les droits

```sql
GRANT ALL PRIVILEGES ON DATABASE ma_bdd TO mon_user;
```

### Lister les bases

```sql
\l
```

### Se connecter à une base

```sql
\c ma_bdd
```

### Lister les tables

```sql
\dt
```

### Quitter psql

```sql
\q
```

---

## ⚙️ Commandes système utiles

Vérifier le statut :

```bash
sudo service postgresql status
```

Redémarrer PostgreSQL :

```bash
sudo service postgresql restart
```

---

## 🌐 Accès depuis Windows

* Host : `localhost`
* Port : `5432`
* User : `mon_user`
* Password : `motdepasse`

---

## ⚠️ Notes importantes

* PostgreSQL doit être démarré manuellement dans WSL
* Les données sont stockées côté Linux (WSL)
* Le port 5432 est accessible depuis Windows via `localhost`

---

## 💡 Astuce

Créer un alias pour démarrer PostgreSQL rapidement :

```bash
echo "alias pgstart='sudo service postgresql start'" >> ~/.bashrc
source ~/.bashrc
```

Puis utiliser :

```bash
pgstart
```

---

## ✅ Prêt !

Tu peux maintenant utiliser PostgreSQL dans WSL pour tes projets 🚀
