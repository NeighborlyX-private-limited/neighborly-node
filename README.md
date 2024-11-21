# Neighborly Node JS Backend

### Steps to Run:

1. Open **CMD/Powershell** in Root Directory.
2. Make sure to get the config.env file from the drive link provided in the group description on the Slack group and paste it in config folder, the backend config will be found in `node-backend` folder on the drive.
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

### Installation of Elastic Search

1. Visit Elasticsearch Downloads. In the Summary section, we can see "view past releases" click it. Then select Elasticsearch 8.15.3 and install it.
2. After downloading, extract the contents to your desired folder.
3. Copy the path of the JDK folder and add it to your PATH environment variable.
4. Open a command prompt, navigate to the bin folder inside the Elasticsearch directory, and run ".\elasticsearch.bat" .

### Installation of Redis

1. Visit https://github.com/microsoftarchive/redis/releases
2. Download the Redis-x64-3.0.504.msi
3. Locate the .msi file and install. Ensure that the "Add the Redis installation folder to the PATH environmental variable" is ticked and click "Next".
4. Click the "Add an exception to the Windows Firewall" box and click "Next".
5. Set the memory limit for the Redis storage on your local machine and click "Next".
