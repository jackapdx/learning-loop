![Avatar for Philip Hurst](https://www.crunchydata.com/build/_assets/default.png-W4XGD4DB.webp)

Philip Hurst

Mar 9, 2023·9 min read

[More by this author](https://www.crunchydata.com/blog/author/philip-hurst)

## Latest Articles

- [Postgres Serials Should be BIGINT (and How to Migrate)](https://www.crunchydata.com/blog/postgres-serials-should-be-bigint-and-how-to-migrate)
- [Postgres 18 New Default for Data Checksums and How to Deal with Upgrades](https://www.crunchydata.com/blog/postgres-18-new-default-for-data-checksums-and-how-to-deal-with-upgrades)
- [PostGIS Performance: Simplification](https://www.crunchydata.com/blog/postgis-performance-simplification)
- [Postgres Scan Types in EXPLAIN Plans](https://www.crunchydata.com/blog/postgres-scan-types-in-explain-plans)
- [PostGIS Performance: Data Sampling](https://www.crunchydata.com/blog/postgis-performance-data-sampling)

[Postgres Tutorials](https://www.crunchydata.com/blog/topic/postgres-tutorials)

# Introduction to Postgres Backups

![Avatar for Philip Hurst](https://www.crunchydata.com/build/_assets/default.png-W4XGD4DB.webp)

Philip Hurst

Mar 9, 2023·9 min read· [More by this author](https://www.crunchydata.com/blog/author/philip-hurst)

Backups in the database world are essential. They are the safety net protecting you from even the smallest bit of data loss. There’s a variety of ways to back up your data and this post aims to explain the basic tools involved in backups and what options you have, from just getting started to more sophisticated production systems.

### [pg\_dump/pg\_restore](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#pg_dumppg_restore)

`pg_dump` and `pg_dumpall` are tools designed to generate a file and then allow a database to be restored. These are classified as logical backups and they can be much smaller in size than physical backups. This is due, in part, to the fact that indexes are not stored in the SQL dump. Only the `CREATE INDEX` command is stored and indexes must be rebuilt when restoring from a logical backup.

One advantage of the SQL dump approach is that the output can generally be reloaded into newer versions of Postgres so dump and restores are very popular for version upgrades and migrations. Another advantage is that these tools can be configured to back up specific database objects and ignore others. This is helpful, for example, if only a certain subset of tables need to be brought up in a test environment. Or you want to back up a single table as you do some risky work.

Postgres dumps are also internally consistent, which means the dump represents a snapshot of the database at the time the process started. Dumps will usually not block other operations, but they can be long-running (i.e. several hours or days, depending on hardware and database size). Because of the method Postgres uses to implement concurrency, known as Multiversion Concurrency Control, long running backups may cause Postgres to experience performance degradation until the dump completes.

To dump a single database table you can run something like:

```shell
pg_dump -t my_table > table.sql
```

To restore it, run something like:

```shell
psql -f table.sql
```

#### [pg\_dump as a corruption check](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#pg_dump-as-a-corruption-check)

pg\_dump sequentially scans through the entire data set as it creates the file. Reading the entire database is a rudimentary corruption check for all the table data, but not for indexes. If your data is corrupted, pg\_dump will throw an exception. Crunchy generally recommends using the [`amcheck`](https://www.postgresql.org/docs/current/amcheck.html) module to do a corruption check, especially during some kind of upgrade or migration where [collations](https://www.crunchydata.com/blog/postgres-migration-pitstop-collations) might be involved.

### [Server & file system backups](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#server--file-system-backups)

If you’re coming from the Linux admin world, you’re used to backup options for the entire machine your database runs on, using `rsync` or another tool. Postgres cannot safely backup using file-oriented tools while it’s running, and there’s not a simple way to quiesce writes either. To get the database into a state where you can `rsync` the data, you either have to shut it down or go through all the work of setting up change archiving. There are also some other options for storage layers that support snapshots for the entire data directory - but read the fine print on these.

### [Physical Backups & WAL archiving](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#physical-backups--wal-archiving)

Beyond basic dump files, the more sophisticated methods of Postgres backup all depend on saving the database’s Write-Ahead-Log (WAL) files. WAL tracks changes to all the database blocks, saving them into segments that default to 16MB in size. The continuous set of a server’s WAL files are referred to as its WAL stream. You have to start archiving the WAL stream’s files before you can safely copy the database, followed by a procedure that produces a “Base Backup”, i.e. `pg_basebackup`. The incremental aspect of WAL makes possible a series of other restoration features lumped under the banner of [Point In Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html) tools.

#### [Create a basebackup with pg\_basebackup](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#create-a-basebackup-with-pg_basebackup)

You can use something like this:

```shell
$ sudo -u postgres pg_basebackup -h localhost -p 5432 -U postgres \
	-D /var/lib/pgsql/15/backups -Ft -z -Xs -P -c fast
```

A few comments on the command above.

- This command should be run as the `postgres` user.
- The `-D` parameter specifies where to save the backup.
- The `-Ft` parameter indicates the tar format should be used.
- The `-Xs` parameter indicates that WAL files will stream to the backup. This is important because substantial WAL activity could occur while the backup is taken and you may not want to retain those files in the primary during this period. This is the default behavior, but worth pointing out.
- The `-z` parameter indicates that tar files will be compressed.
- The `-P` parameter indicates that progress information is written to stdout during the process.
- The `-c` fast parameter indicates that a checkpoint is taken immediately. If this parameter is not specified, then the backup will not begin until Postgres issues a checkpoint on its own, and this could take a significant amount of time.

Once the command is entered, the backup should begin immediately. Depending upon the size of the cluster, it may take some time to finish. However, it will not interrupt any other connections to the database.

### [Steps to restore from a backup taken with pg\_basebackup](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#steps-to-restore-from-a-backup-taken-with-pg_basebackup)

They are simplified from the [official documentation](https://www.postgresql.org/docs/current/continuous-archiving.html#BACKUP-PITR-RECOVERY). If you are using some features like tablespaces you will need to modify these steps for your environment.

1. Ensure the database is shutdown.


```shell
sudo systemctl stop postgresql-15.service
sudo systemctl status postgresql-15.service
```

2. Remove the contents of the Postgres data directory to simulate the disaster.


```shell
sudo rm -rf /var/lib/pgsql/15/data/*
```

3. Extract base.tar.gz into the data directory.


```shell
$ sudo -u postgres ls -l /var/lib/pgsql/15/backups
total 29016
   -rw-------. 1 postgres postgres   182000 Nov 23 21:09 backup_manifest
   -rw-------. 1 postgres postgres 29503703 Nov 23 21:09 base.tar.gz
   -rw-------. 1 postgres postgres	17730 Nov 23 21:09 pg_wal.tar.gz


$ sudo -u postgres tar -xvf /var/lib/pgsql/15/backups/base.tar.gz \
        -C /var/lib/pgsql/15/data
```

4. Extract pg\_wal.tar.gz into a new directory outside the data directory. In our case, we create a directory called pg\_wal inside our backups directory.


```shell
$ sudo -u postgres ls -l /var/lib/pgsql/15/backups
total 29016
   -rw-------. 1 postgres postgres   182000 Nov 23 21:09 backup_manifest
   -rw-------. 1 postgres postgres 29503703 Nov 23 21:09 base.tar.gz
   -rw-------. 1 postgres postgres	17730 Nov 23 21:09 pg_wal.tar.gz

$ sudo -u postgres mkdir -p /var/lib/pgsql/15/backups/pg_wal

$ sudo -u postgres tar -xvf /var/lib/pgsql/15/backups/pg_wal.tar.gz \
         -C /var/lib/pgsql/15/backups/pg_wal/
```

5. Create the recovery.signal file.


```shell
sudo -u postgres touch /var/lib/pgsql/15/data/recovery.signal
```

6. Set the restore\_command in postgresql.conf to copy the WAL files streamed during the backup.


```shell
echo "restore_command = 'cp /var/lib/pgsql/15/backups/pg_wal/%f %p'" | \
         sudo tee -a /var/lib/pgsql/15/data/postgresql.conf
```

7. Start the database.


```shell
$ sudo systemctl start postgresql-15.service sudo systemctl status
postgresql-15.service
```

8. Now your database is up and running based on the information contained in the previous basebackup.


#### [Automating physical backups](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#automating-physical-backups)

Building upon the `pg_basebackup`, you could write a series of scripts to use this backup, add WAL segments to it, and manage a complete physical backup scenario. There are several tools out there including WAL-E, WAL-G, and pgBackRest that will do all this for you. WAL-G is the next generation of WAL-E and works for quite a few other databases including MySQL and Microsoft SQL Server. WAL-G is also used extensively at the enterprise level with some large Postgres environments, including Heroku. When we first built Crunchy Bridge, we had a choice between WAL-G and pgBackRest since we employ the maintainers of both and each has its perks. In the end, we selected pgBackRest.

### [pgBackRest](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#pgbackrest)

[pgBackRest](https://pgbackrest.org/) is the best in class backup tool out there. There are a number of very large Postgres environments relying on pgBackRest, including our own [Crunchy Bridge](https://crunchybridge.com/login?redirectTo=https://crunchybridge.com/), [Crunchy for Kubernetes](https://www.crunchydata.com/products/crunchy-postgresql-for-kubernetes), and [Crunchy Postgres](https://www.crunchydata.com/products/crunchy-high-availability-postgresql) as well as countless other projects in the Postgres ecosystem.

pgBackRest can perform three types of backups:

- Full backups - these copy the entire contents of the database cluster to the backup.
- Differential backups - this copies only the database cluster files that have changed since the last full backup
- Incremental backups - which copy only the database cluster files that have changed since the last full, differential, or incremental.

pgBackRest has some special features like:

- Allowing you to go back to a Point in Time - PITR (Point-in-Time Recovery)
- Creating a Delta Restore which will use database files already present and updated based on WAL segments. This makes potential restores much faster, especially if you have a large database and don’t want to restore the entire thing.
- Letting you have multiple backup repositories - say one local or one remote for redundancy.

Concerning archiving, users can set the `archive_command` parameter to use pgBackRest to copy WAL files to an external archive. These files could be retained indefinitely or expired in accordance with your organization's data retention policies.

To start pgBackRest after installation, you’ll run something like this:

```shell
sudo -u postgres pgbackrest --stanza=demo --log-level-console=info stanza-create
```

To do a delta restore:

```shell
$ sudo systemctl stop postgresql-15.service
$ sudo -u postgres pgbackrest \
--stanza=db --delta \
--type=time "--target=2022-09-01 00:00:05.010329+00" \
--target-action=promote restore
```

When the restore completes, you restart the database and verify that the users table is back.

```shell
sudo systemctl start postgresql-15.service
sudo -u postgres psql -c "select * from users limit 1"
```

#### [Backup timing](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#backup-timing)

pgBackRest has pretty extensive settings and configurations to set up a strategy specific to your needs. Your backup strategy will depend on several factors, including the recovery point objective, available storage, and other factors. The right solution will vary based on these requirements. Finding the right strategy for your use case is a matter of striking a balance between the time to restore, the storage used, IO overhead on the source database, and other factors.

Our usual recommendation is to combine the backup and WAL archival capabilities of pgBackRest. We usually recommend customers take a weekly full base backup in addition to their continuous archiving of WAL files, and consider if other incremental backup forms--maybe even pg\_dump--make sense for your requirements.

### [Conclusion](https://www.crunchydata.com/blog/introduction-to-postgres-backups\#conclusion)

![grid of postgres migrations options and their features and capabilities](https://imagedelivery.net/lPM0ntuwQfh8VQgJRu0mFg/2c48c0ee-a608-46fb-8d4e-5839f0a0eb00/public)

Choosing the backup tool for your use case will be a personal choice based on your needs, tolerance for recovery time, and available storage. In general, it is best to think of pg\_dump is as a utility for doing specific database tasks. pg\_basebackup can be an option if you’re ok with single physical backups on a specific time basis. If you have a production system of size and need to create a disaster recovery scenario, it's best to implement pgBackRest or a more sophisticated tool using WAL segments on top of a base backup. Of course, there’s fully managed options out there like [Crunchy Bridge](https://www.crunchydata.com/products/crunchy-bridge) which will handle all this for you.

Co-authored with Elizabeth Christensen

## Related Articles

- Jan 20, 2026·11 min read


[Postgres Serials Should be BIGINT (and How to Migrate)](https://www.crunchydata.com/blog/postgres-serials-should-be-bigint-and-how-to-migrate)
- Dec 11, 2025·4 min read


[Postgres 18 New Default for Data Checksums and How to Deal with Upgrades](https://www.crunchydata.com/blog/postgres-18-new-default-for-data-checksums-and-how-to-deal-with-upgrades)
- Dec 9, 2025·3 min read


[PostGIS Performance: Simplification](https://www.crunchydata.com/blog/postgis-performance-simplification)
- Dec 4, 2025·9 min read


[Postgres Scan Types in EXPLAIN Plans](https://www.crunchydata.com/blog/postgres-scan-types-in-explain-plans)
- Nov 21, 2025·3 min read


[PostGIS Performance: Data Sampling](https://www.crunchydata.com/blog/postgis-performance-data-sampling)

![](https://link.crunchydata.com/logo.gif?page=aHR0cHM6Ly93d3cuY3J1bmNoeWRhdGEuY29tL2Jsb2cvaW50cm9kdWN0aW9uLXRvLXBvc3RncmVzLWJhY2t1cHM=)