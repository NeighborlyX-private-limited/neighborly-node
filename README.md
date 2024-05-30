# Neighborly Node JS Backend

### Steps to Run:

1. Open **CMD/Powershell** in Root Directory.
2. Make sure to get the config.env file from the drive link provided in the group description on the WhatsApp group and paste it in config folder, the backend config will be found in `node-backend` folder on the drive.
3. In `config.env` set `API_PREFIX` as empty.
4. Get the mongoDb creds from the Repo owner. Whitelist your IP after logging in:
5. Run command **`npm install`**
6. Run command **`npm run dev`**
7. The backend service will be live at http://localhost:5000

### FAQ

1. If you face an issue with querysrv its most likely because
   1. your node version is out of date as this issue arises with mongoose. Please update according to your OS.
   2. Check the DB_URI string and use the older format.
      mongodb://<username>:<password>@ac-jvzfql4-shard-00-00.cncxy2q.mongodb.net:27017,ac-jvzfql4-shard-00-01.cncxy2q.mongodb.net:27017,ac-jvzfql4-shard-00-02.cncxy2q.mongodb.net:27017/?ssl=true&replicaSet=atlas-14ovul-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0

NOTE: Please configure prettier on your VScode for JS project.
