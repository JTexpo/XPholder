class sqlLite3DatabaseService {
    constructor(sqlite3, databaseName) {
        this.sqlite3 = sqlite3;
        this.databaseName = databaseName;
        this.database;
    }

    async openDatabase() {
        return await new Promise(async resolve => {
            this.database = await new this.sqlite3.Database(this.databaseName, (err) => {
                if (err) { console.error(err.message); resolve(false); return; }
            });
            resolve(this);
        })
    }

    closeDatabase() {
        return this.database.close((err) => {
            if (err) { console.error(err.message); resolve(false); return; }
        });
    }

    async execute(query) {
        return await new Promise((resolve, reject) => {
            this.database.run(query, (err, data) => {
                if (err) { console.error(err.message); resolve(false); return; }
                resolve(data);
            })
        });
    }

    async getAll(query) {
        return await new Promise((resolve, reject) => {
            this.database.all(query, (err, data) => {
                if (err) { console.error(err.message); resolve(false); return; }
                resolve(data);
            })
        });
    }
    async get(query) {
        return await new Promise((resolve, reject) => {
            this.database.get(query, (err, data) => {
                if (err) { console.error(err.message); resolve(false); return; }
                resolve(data);
            })
        });
    }
}

module.exports = { sqlLite3DatabaseService }