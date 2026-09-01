import random
from datetime import datetime, timedelta
from faker import Faker
from db import get_connection

# Inisialisasi Faker dengan locale Indonesia
fake = Faker("id_ID")
random.seed(42)  # Seed konstan agar hasil data konsisten saat di-reseed


def create_schema(cursor):
    """Membuat struktur tabel database e-commerce."""
    print("📦 Membuat struktur tabel (DDL)...")
    
    # Drop tabel lama jika ada (CASCADE agar foreign keys tidak menghalangi)
    cursor.execute("""
        DROP TABLE IF EXISTS order_items CASCADE;
        DROP TABLE IF EXISTS orders CASCADE;
        DROP TABLE IF EXISTS customers CASCADE;
        DROP TABLE IF EXISTS products CASCADE;
        DROP TABLE IF EXISTS regions CASCADE;
        DROP TABLE IF EXISTS categories CASCADE;
    """)

    # 1. Tabel categories
    cursor.execute("""
        CREATE TABLE categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT
        );
    """)

    # 2. Tabel regions
    cursor.execute("""
        CREATE TABLE regions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            province VARCHAR(100) NOT NULL
        );
    """)

    # 3. Tabel products
    cursor.execute("""
        CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
            price DECIMAL(12,2) NOT NULL,
            cost DECIMAL(12,2) NOT NULL,
            stock INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # 4. Tabel customers
    cursor.execute("""
        CREATE TABLE customers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200) UNIQUE NOT NULL,
            region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
            joined_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # 5. Tabel orders
    cursor.execute("""
        CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            order_date TIMESTAMP NOT NULL,
            status VARCHAR(50) DEFAULT 'completed',
            total_amount DECIMAL(15,2) DEFAULT 0,
            shipping_cost DECIMAL(12,2) DEFAULT 0
        );
    """)

    # 6. Tabel order_items
    cursor.execute("""
        CREATE TABLE order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(12,2) NOT NULL,
            subtotal DECIMAL(15,2) NOT NULL
        );
    """)


def seed_categories_and_regions(cursor):
    """Menyisipkan data kategori produk dan wilayah di Indonesia."""
    print("🏷️  Mengisi tabel categories dan regions...")

    categories = [
        ("Elektronik", "Gadget, laptop, aksesoris komputer, dan elektronik rumah tangga"),
        ("Fashion", "Pakaian pria, wanita, sepatu, tas, dan aksesoris gaya"),
        ("Makanan & Minuman", "Camilan, minuman segar, bumbu dapur, dan kopi nusantara"),
        ("Kecantikan & Perawatan", "Skincare, kosmetik, sabun, dan perawatan tubuh"),
        ("Olahraga & Outdoor", "Peralatan fitness, jersey, tenda, dan sepatu lari"),
        ("Otomotif", "Oli mesin, helm, aksesoris motor dan mobil"),
        ("Rumah Tangga", "Perabot rumah, sprei, peralatan masak, dan dekorasi"),
        ("Buku & Alat Tulis", "Buku novel, buku bisnis, alat tulis kantor, dan binder"),
        ("Mainan & Hobi", "Action figure, board game, lego, dan perlengkapan hobi"),
        ("Kesehatan", "Vitamin, suplemen kesehatan, masker, dan P3K"),
    ]
    cursor.executemany(
        "INSERT INTO categories (name, description) VALUES (%s, %s);",
        categories
    )

    regions = [
        ("Jabodetabek", "DKI Jakarta & Sekitarnya"),
        ("Jawa Barat", "Jawa Barat"),
        ("Jawa Timur", "Jawa Timur"),
        ("Bali & NTB", "Bali"),
        ("Sumatera Utara", "Sumatera Utara"),
    ]
    cursor.executemany(
        "INSERT INTO regions (name, province) VALUES (%s, %s);",
        regions
    )


def seed_products(cursor):
    """Menyisipkan 50+ produk realistis dengan harga jual & modal dalam Rupiah."""
    print("📱 Mengisi tabel products...")

    product_catalogs = {
        1: [  # Elektronik
            ("Smartphone Flagship X12 256GB", 12500000, 10000000),
            ("Laptop Ultrabook 14 inch", 14500000, 11800000),
            ("TWS Wireless Earbuds Pro", 850000, 520000),
            ("Mechanical Keyboard RGB", 750000, 480000),
            ("Smart Watch Active Fit", 1200000, 800000),
            ("Powerbank 20000mAh Fast Charging", 320000, 190000),
        ],
        2: [  # Fashion
            ("Kemeja Flanel Casual Pria", 220000, 130000),
            ("Celana Jeans Slim Fit Denim", 350000, 210000),
            ("Sneakers Canvas Retro", 450000, 270000),
            ("Dress Midi Polkadot Casual", 280000, 160000),
            ("Jaket Hoodie Cotton Fleece", 310000, 185000),
            ("Tas Ransel Laptop Anti Air", 380000, 220000),
        ],
        3: [  # Makanan & Minuman
            ("Kopi Arabika Gayo 250gr", 85000, 55000),
            ("Keripik Tempe Renyah Balado", 25000, 14000),
            ("Madu Murni Sumbawa 500ml", 140000, 95000),
            ("Teh Hijau Organik Melati", 45000, 28000),
            ("Sambal Bawang Roa Khas Manado", 50000, 30000),
        ],
        4: [  # Kecantikan & Perawatan
            ("Serum Wajah Niacinamide 10%", 120000, 65000),
            ("Sunscreen SPF 50 Matte Finish", 95000, 52000),
            ("Micellar Water Cleanser 400ml", 65000, 38000),
            ("Moisturizer Gel Centella Asiatica", 110000, 60000),
            ("Lip Tint Velvet Longlasting", 55000, 28000),
        ],
        5: [  # Olahraga & Outdoor
            ("Matras Yoga Anti Slip 8mm", 165000, 95000),
            ("Dumbbell Set Neoprene 5kg", 180000, 110000),
            ("Sepatu Lari Road Running", 650000, 420000),
            ("Tenda Camping Dome 4 Orang", 780000, 520000),
            ("Botol Minum Olahraga 1L BPA Free", 75000, 40000),
        ],
        6: [  # Otomotif
            ("Oli Mesin Sintetis 4T 1L", 90000, 60000),
            ("Helm Full Face Double Visor", 480000, 320000),
            ("Jas Hujan Setelan PVC Tebal", 135000, 80000),
            ("Shampoo Mobil Wax & Shine 1L", 45000, 25000),
            ("Pompa Ban Elektrik Portable", 320000, 210000),
        ],
        7: [  # Rumah Tangga
            ("Panci Wajan Granit Anti Lengket", 240000, 145000),
            ("Blender Juicer Portable USB", 150000, 88000),
            ("Sprei Katun Jepang King Size", 310000, 195000),
            ("Lampu Meja LED Dimmable", 115000, 68000),
            ("Kotak Penyimpanan Serbaguna 30L", 85000, 48000),
        ],
        8: [  # Buku & Alat Tulis
            ("Buku 'Atomic Habits' Edisi Indo", 108000, 72000),
            ("Buku 'Psikologi Uang' (Psychology of Money)", 98000, 65000),
            ("Notebook Bullet Journal Dotted", 65000, 35000),
            ("Set Pulpen Gel 0.5mm 12 Warna", 42000, 22000),
            ("Desk Mat Kulit Sintetis 80x40cm", 95000, 55000),
        ],
        9: [  # Mainan & Hobi
            ("Action Figure Gundam HG 1/144", 260000, 175000),
            ("Board Game Catan Edisi Standar", 580000, 390000),
            ("Rubik Speedcube 3x3 Magnetic", 120000, 70000),
            ("Set Cat Air Watercolor 36 Warna", 145000, 85000),
        ],
        10: [  # Kesehatan
            ("Multivitamin & Zinc 30 Tablet", 85000, 52000),
            ("Masker Medis 3 Ply Box Isi 50", 35000, 18000),
            ("Termometer Digital Infrared", 175000, 105000),
            ("Minyak Kayu Putih Aromatherapy 100ml", 48000, 31000),
        ],
    }

    products_to_insert = []
    for cat_id, items in product_catalogs.items():
        for name, price, cost in items:
            stock = random.randint(20, 250)
            products_to_insert.append((name, cat_id, price, cost, stock))

    cursor.executemany(
        """
        INSERT INTO products (name, category_id, price, cost, stock)
        VALUES (%s, %s, %s, %s, %s);
        """,
        products_to_insert
    )


def seed_customers(cursor, num_customers=120):
    """Menyisipkan pelanggan dengan nama Indonesia dan distribusi wilayah realistis."""
    print(f"👥 Mengisi {num_customers} data customers...")

    # Bobot wilayah: Jabodetabek (40%), Jabar (25%), Jatim (15%), Bali (10%), Sumut (10%)
    region_weights = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5]

    customers_to_insert = []
    used_emails = set()

    for i in range(num_customers):
        name = fake.name()
        clean_name = name.lower().replace(" ", ".").replace(",", "")
        email = f"{clean_name}.{i+1}@{fake.free_email_domain()}"
        
        region_id = random.choice(region_weights)
        joined_days_ago = random.randint(30, 450)
        joined_at = datetime.now() - timedelta(days=joined_days_ago)

        customers_to_insert.append((name, email, region_id, joined_at))

    cursor.executemany(
        """
        INSERT INTO customers (name, email, region_id, joined_at)
        VALUES (%s, %s, %s, %s);
        """,
        customers_to_insert
    )

def seed_orders_and_items(cursor, num_orders=600):
    """
    Menyisipkan pesanan (orders) dan detail item (order_items)
    dalam rentang 1 Januari 2026 hingga 1 September 2026.
    Lengkap dengan dinamika musiman:
    - Maret-April 2026: Ramadan & Lebaran (Fashion, Makanan, Rumah Tangga naik tajam)
    - Juni-Juli 2026: Back to School (Buku, Elektronik naik)
    - Agustus 2026: Promo Kemerdekaan 17-an
    """
    print(f"🛒 Mengisi {num_orders} orders & detail order_items (Januari - September 2026)...")

    # Ambil list customer_id dan produk yang tersedia
    cursor.execute("SELECT id FROM customers;")
    customer_ids = [row[0] for row in cursor.fetchall()]

    # products_info: [(id, price, category_id), ...]
    cursor.execute("SELECT id, price, category_id FROM products;")
    products_info = cursor.fetchall()

    # Pisahkan produk berdasarkan category_id untuk event musiman
    # 1: Elektronik, 2: Fashion, 3: Makanan, 4: Kecantikan, 7: Rumah Tangga, 8: Buku
    products_by_category = {}
    for p in products_info:
        p_id, p_price, cat_id = p
        products_by_category.setdefault(cat_id, []).append(p)

    start_date = datetime(2026, 1, 1, 8, 0, 0)
    end_date = datetime(2026, 9, 1, 12, 0, 0)
    total_seconds = int((end_date - start_date).total_seconds())

    order_items_to_insert = []
    orders_to_insert = []

    statuses = ["completed"] * 85 + ["pending"] * 10 + ["cancelled"] * 5
    order_id_counter = 1

    # Bobot distribusi bulan: Maret-April (Lebaran) & Agustus (Kemerdekaan) dapat porsi order lebih banyak
    month_weights = {
        1: 0.8,   # Januari (Post New Year)
        2: 0.9,   # Februari
        3: 1.6,   # Maret (Ramadan belanja naik)
        4: 1.8,   # April (Lebaran Idul Fitri peak)
        5: 1.0,   # Mei
        6: 1.3,   # Juni (Libur & Back to school)
        7: 1.3,   # Juli (Tahun ajaran baru)
        8: 1.5,   # Agustus (Promo Kemerdekaan 17 Agustus)
        9: 0.9,   # Awal September 2026
    }

    for _ in range(num_orders):
        customer_id = random.choice(customer_ids)

        # Generate tanggal acak antara Jan 2026 - Sep 2026 dengan pembobotan
        while True:
            random_sec = random.randint(0, total_seconds)
            order_date = start_date + timedelta(seconds=random_sec)
            month = order_date.month
            weight = month_weights.get(month, 1.0)
            # Rejection sampling sederhana untuk mencocokkan bobot bulan
            if random.random() < (weight / 2.0):
                break

        status = random.choice(statuses)
        shipping_cost = random.choice([10000, 15000, 20000, 25000, 35000, 0])

        # Efek Produk Musiman:
        # Jika Maret/April (Lebaran), perbesar peluang membeli Fashion (2), Makanan (3), Rumah Tangga (7)
        if order_date.month in [3, 4] and random.random() < 0.65:
            preferred_cats = [2, 3, 7]
            chosen_cat = random.choice(preferred_cats)
            seasonal_pool = products_by_category.get(chosen_cat, products_info)
            primary_product = random.choice(seasonal_pool)
        # Jika Juni/Juli, perbesar peluang Buku (8) dan Elektronik (1)
        elif order_date.month in [6, 7] and random.random() < 0.50:
            preferred_cats = [1, 8]
            chosen_cat = random.choice(preferred_cats)
            seasonal_pool = products_by_category.get(chosen_cat, products_info)
            primary_product = random.choice(seasonal_pool)
        else:
            primary_product = random.choice(products_info)

        # Jumlah item per order (1-4 item)
        num_items = random.choices([1, 2, 3, 4], weights=[45, 35, 15, 5])[0]
        chosen_products = [primary_product]
        if num_items > 1:
            remaining_needed = num_items - 1
            other_products = [p for p in products_info if p[0] != primary_product[0]]
            chosen_products.extend(random.sample(other_products, remaining_needed))

        order_total = shipping_cost
        for prod_id, unit_price, _ in chosen_products:
            qty = random.choices([1, 2, 3], weights=[70, 20, 10])[0]
            subtotal = float(unit_price) * qty
            order_total += subtotal

            order_items_to_insert.append((
                order_id_counter, prod_id, qty, unit_price, subtotal
            ))

        orders_to_insert.append((
            order_id_counter, customer_id, order_date, status, order_total, shipping_cost
        ))
        order_id_counter += 1

    # Urutkan pesanan berdasarkan order_date agar id order berurutan secara kronologis
    orders_to_insert.sort(key=lambda x: x[2])
    
    # Re-map order_id setelah disortir
    id_mapping = {}
    for new_id, order in enumerate(orders_to_insert, start=1):
        old_id = order[0]
        id_mapping[old_id] = new_id

    final_orders = [
        (id_mapping[o[0]], o[1], o[2], o[3], o[4], o[5])
        for o in orders_to_insert
    ]
    final_items = [
        (id_mapping[item[0]], item[1], item[2], item[3], item[4])
        for item in order_items_to_insert
    ]

    cursor.executemany(
        """
        INSERT INTO orders (id, customer_id, order_date, status, total_amount, shipping_cost)
        VALUES (%s, %s, %s, %s, %s, %s);
        """,
        final_orders
    )

    cursor.execute("SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));")

    cursor.executemany(
        """
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES (%s, %s, %s, %s, %s);
        """,
        final_items
    )

def print_summary(cursor):
    """Menampilkan rangkuman statistik data yang berhasil di-generate."""
    print("\n" + "=" * 55)
    print("🎉 SEEDING SELESAI! RANGKUMAN DATABASE:")
    print("=" * 55)

    tables = ["categories", "regions", "products", "customers", "orders", "order_items"]
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        print(f"  • Tabel {table.ljust(15)} : {count:,} baris")

    cursor.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
            COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue
        FROM orders;
    """)
    completed_orders, total_revenue = cursor.fetchone()
    print("-" * 55)
    print(f"  💰 Total Revenue (Completed) : Rp {total_revenue:,.2f}")
    print(f"  📦 Total Pesanan Selesai     : {completed_orders:,}")
    print("=" * 55)


def run():
    print("🚀 Memulai proses seeding database BizInsight...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            create_schema(cur)
            seed_categories_and_regions(cur)
            seed_products(cur)
            seed_customers(cur, num_customers=120)
            seed_orders_and_items(cur, num_orders=600)
            print_summary(cur)
        
        # Commit seluruh transaksi
        conn.commit()
        print("\n✅ Database berhasil di-populate dan di-commit!")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error saat seeding database: {e}")
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    run()