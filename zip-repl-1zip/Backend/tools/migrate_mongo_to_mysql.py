#!/usr/bin/env python3
"""
One-time MongoDB Atlas -> MySQL data migration for the BII app.

Reads documents from the FastAPI MongoDB collections and inserts them into the
Yii2 MySQL schema (see /migrations). Run from the deployment where both
connections are reachable:

    pip install motor pymongo pymysql python-dotenv   # as needed
    cp .env.example .env                              # set MONGODB_URI + MYSQL_*
    python3 tools/migrate_mongo_to_mysql.py --dry-run        # preview counts
    python3 tools/migrate_mongo_to_mysql.py --only=users     # one collection
    python3 tools/migrate_mongo_to_mysql.py                  # run everything

JSON-typed MySQL columns store already-encoded JSON strings, so keep dict/list
values as JSON here. Timestamps come across as Python isoformat() strings.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

try:
    import pymongo
except ImportError:
    sys.stderr.write("pymongo not installed\n")
    sys.exit(1)

try:
    import pymysql
except ImportError:
    sys.stderr.write("pymysql not installed\n")
    sys.exit(1)

MONGODB_URI = os.environ.get("MONGODB_URI", "")
DB_NAME = os.environ.get("MONGODB_DB", "bii")

MYSQL = dict(
    host=os.environ.get("MYSQL_HOST", "localhost"),
    user=os.environ.get("MYSQL_USER", "root"),
    password=os.environ.get("MYSQL_PASSWORD", ""),
    database=os.environ.get("MYSQL_DATABASE", "bii"),
    charset="utf8mb4",
    autocommit=True,
)


def j(v):
    """JSON-encode for JSON/TEXT columns; None passes through."""
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    return v


def rows_of(collection):
    """Yield cleaned documents (no _id, string ids, iso timestamps)."""
    for d in collection.find({}, {"_id": 0}):
        if "id" in d:
            d["id"] = str(d["id"])
        for k in list(d.keys()):
            if isinstance(d[k], dict) and "_id" in d[k]:
                d[k] = str(d[k]["$oid"])
            if isinstance(d[k], list):
                d[k] = j(d[k])
        yield d


# (collection, table, [column,...] or callable)  — callable returns the row dict.
# Columns are matched by key from the Mongo doc.
def col(s):
    return [c.strip() for c in s.split(",") if c.strip()]


TABLES = [
    ("users", "users", col("id,name,email,password_hash,role,student_id,phone,address,profile_photo,created_at,updated_at,bio,specialization")),
    ("courses", "courses", col("id,title_bn,title_en,description_bn,description_en,price,is_free,cover_image,instructor,duration,created_at,updated_at")),
    ("videos", "videos", col("id,title_bn,title_en,description,video_url,thumbnail,course_id,created_at,updated_at")),
    ("posts", "posts", col("id,title_bn,title_en,body_bn,body_en,cover_image,course_id,created_at,updated_at")),
    ("live_classes", "live_classes", col("id,title_bn,title_en,join_url,scheduled_at,description,course_id,is_free,created_at,updated_at")),
    ("quizzes", "quizzes", col("id,title_bn,title_en,description,month,questions,starts_at,ends_at,created_at,updated_at")),
    ("monthly_quizzes", "monthly_quizzes", col("id,title_bn,title_en,exam_date,start_time,end_time,duration_minutes,pass_marks,rules,prize_title,prize_description,prize_image,is_active,questions,winners,created_at,updated_at")),
    ("quiz_sessions", "quiz_sessions", col("id,quiz_id,user_id,started_at")),
    ("monthly_quiz_submissions", "monthly_quiz_submissions", col("id,quiz_id,user_id,user_name,user_email,user_phone,user_address,student_id,score,total_marks,passed,detail,time_taken_seconds,submitted_at")),
    ("enrollments", "enrollments", col("id,user_id,course_id,enrolled_at,payment_status,amount,transaction_id,payment_method")),
    ("products", "products", col("id,name_bn,name_en,description,price,discount_price,stock,category,image,is_active,is_featured,created_at,updated_at")),
    ("promo_codes", "promo_codes", col("id,code,discount_type,discount_value,min_order,max_uses,used_count,is_active,note,created_at,created_by_user,given_to_student_id,given_by_admin_id,source")),
    # orders -> orders + order_items (see migrate_orders)
    ("payment_requests", "payment_requests", col("id,user_id,user_name,user_email,user_phone,course_id,course_title,transaction_id,payment_method,amount,note,status,submitted_ip,submitted_at,processed_at,processed_by")),
    ("payment_intents", "payment_intents", col("id,user_id,user_email,user_name,user_phone,course_id,subscription_plan_id,amount,product_name,status,created_at")),
    # orders + order_items handled separately by migrate_orders()
    ("subscription_plans", "subscription_plans", col("id,name_bn,name_en,description_bn,description_en,price,duration_days,features,is_active,created_at")),
    ("subscriptions", "subscriptions", col("id,user_id,plan_id,plan_name,amount,transaction_id,gateway,started_at,expires_at,status")),
    ("dua_categories", "dua_categories", col("id,name_bn,icon,description,sort_order,color")),
    ("duas", "duas", col("id,title_bn,category_id,arabic_text,transliteration,meaning_bn,when_to_read,fazilat,source,is_today_dua,view_count,created_at")),
    ("library_categories", "library_categories", col("id,name_bn,name_en,description,icon,sort_order")),
    ("books", "books", col("id,title_bn,title_en,author_bn,author_en,category,description,cover_image,pdf_url,is_published,is_featured,sort_order,created_at")),
    ("reward_balances", "reward_balances", col("id,user_id,coins")),
    ("reward_transactions", "reward_transactions", col("id,user_id,type,coins,promo_code,ref_id,created_at")),
    ("cashout_requests", "cashout_requests", col("id,user_id,user_name,user_email,coins,taka_amount,payment_method,payment_number,status,admin_note,created_at,updated_at")),
    ("reward_ads", "reward_ads", col("id,title,ad_type,media_url,thumbnail_url,duration_seconds,is_active,order,description,created_at")),
    ("complaints", "complaints", col("id,user_id,user_name,subject,message,status,created_at")),
    ("contact_messages", "contact_messages", col("id,name,email,phone,subject,message,created_at")),
    ("notifications", "notifications", col("id,user_id,title_bn,title_en,body_bn,body_en,read,created_at")),
    ("device_tokens", "device_tokens", col("id,user_id,token,device_type,platform,user_email,created_at,updated_at")),
    ("activity_logs", "activity_logs", col("id,user_id,action,target,meta,created_at")),
]

# Schema-less register_crud collections -> generic_items (resource = collection).
GENERIC_COLLECTIONS = [
    "course_categories", "chapters", "lessons", "pdfs", "assignments", "exams",
    "results", "certificates", "recorded_classes", "hadiths", "islamic_content",
    "blogs", "banners", "sliders", "gallery", "downloads", "winner_reviews",
]


def migrate_generic(mdb, conn, dry_run, truncate):
    cur = conn.cursor()
    for resource in GENERIC_COLLECTIONS:
        mongo = mdb[resource]
        n = mongo.count_documents({})
        print(f"[{resource}] -> generic_items (resource={resource}): {n} docs", flush=True)
        if dry_run or n == 0:
            continue
        if truncate:
            cur.execute("DELETE FROM `generic_items` WHERE `resource`=%s", (resource,))
        batch = []
        for d in rows_of(mongo):
            item_id = str(d.get("id", ""))
            data = j({k: v for k, v in d.items() if k not in ("id", "created_at", "updated_at")})
            batch.append((item_id, resource, data, d.get("created_at"), d.get("updated_at")))
        if batch:
            cur.executemany(
                "INSERT INTO `generic_items` (`id`,`resource`,`data`,`created_at`,`updated_at`) VALUES (%s,%s,%s,%s,%s)",
                batch,
            )
        print(f"   inserted {len(batch)}", flush=True)


def migrate_orders(mdb, conn, dry_run, truncate):
    """orders -> orders + order_items (nested items array)."""
    cur = conn.cursor()
    mongo = mdb["orders"]
    n = mongo.count_documents({})
    print(f"[orders] -> orders + order_items: {n} docs", flush=True)
    if dry_run or n == 0:
        return
    if truncate:
        cur.execute("DELETE FROM `order_items`")
        cur.execute("DELETE FROM `orders`")
    order_cols = col("id,order_number,user_id,customer_name,customer_phone,customer_address,payment_method,payment_number,transaction_id,promo_code,discount,subtotal,total,status,note,created_at")
    items_cols = col("id,order_id,product_id,product_name,qty,unit_price,subtotal")
    for d in rows_of(mongo):
        oid = str(d.get("id", ""))
        order_row = tuple(d.get(c) for c in order_cols)
        cur.execute(
            f"INSERT INTO `orders` (`{'`,`'.join(order_cols)}`) VALUES ({','.join(['%s']*len(order_cols))})",
            order_row,
        )
        for it in d.get("items", []):
            cur.execute(
                f"INSERT INTO `order_items` (`{'`,`'.join(items_cols)}`) VALUES ({','.join(['%s']*len(items_cols))})",
                (str(it.get("id", "")), oid, it.get("product_id", ""), it.get("product_name", ""),
                 it.get("qty", 1), it.get("unit_price", 0), it.get("subtotal", 0)),
            )
    print(f"   orders + nested order_items inserted", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="migrate a single Mongo collection")
    ap.add_argument("--dry-run", action="store_true", help="only report counts")
    ap.add_argument("--truncate", action="store_true", help="DELETE existing rows first")
    args = ap.parse_args()

    if not MONGODB_URI:
        sys.exit("MONGODB_URI not set (see .env)")

    mc = pymongo.MongoClient(MONGODB_URI)
    mdb = mc[DB_NAME]
    conn = pymysql.connect(**MYSQL)
    cur = conn.cursor()

    for coll, table, cols in TABLES:
        if args.only and coll != args.only:
            continue
        mongo = mdb[coll]
        n = mongo.count_documents({})
        print(f"[{coll}] -> {table}: {n} docs", flush=True)
        if args.dry_run or n == 0:
            continue
        if args.truncate:
            cur.execute(f"DELETE FROM `{table}`")
        columns = cols if callable(cols) else cols
        inserted = 0
        batch = []
        for d in rows_of(mongo):
            row = {c: d.get(c) for c in columns}
            # JSON-typed columns stored as JSON strings.
            for k in row:
                if isinstance(row[k], (dict, list)):
                    row[k] = j(row[k])
            batch.append(tuple(row[c] if c in row else None for c in columns))
        if batch:
            marks = ",".join(["%s"] * len(columns))
            sql = f"INSERT INTO `{table}` (`{'`,`'.join(columns)}`) VALUES ({marks})"
            cur.executemany(sql, batch)
            inserted = len(batch)
        print(f"   inserted {inserted}", flush=True)

    if not args.only:
        migrate_orders(mdb, conn, args.dry_run, args.truncate)
        migrate_generic(mdb, conn, args.dry_run, args.truncate)
    elif args.only in ("orders",) or args.only in GENERIC_COLLECTIONS:
        migrate_orders(mdb, conn, args.dry_run, args.truncate) if args.only == "orders" \
            else migrate_generic(mdb, conn, args.dry_run, args.truncate)

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
