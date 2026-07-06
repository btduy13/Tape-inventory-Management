"""Integration tests for order status update (da_giao / da_tat_toan)."""
import os
import sys
import unittest

import psycopg2

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.ctmkkxfheqjdmjahkheu:M4tkh%40u_11@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
)

TABLE_MAP = {
    "bang-keo-in": "bang_keo_in_orders",
    "truc-in": "truc_in_orders",
    "bang-keo": "bang_keo_orders",
}


def get_stats_table_name(subtab: str) -> str:
    if subtab == "truc-in":
        return "truc_in_orders"
    if subtab == "bang-keo":
        return "bang_keo_orders"
    return "bang_keo_in_orders"


from src.utils.helpers import apply_settlement_debt, repair_settled_orders_debt


def update_order_status(conn, table_name: str, order_id: str, da_giao: bool, da_tat_toan: bool):
    sql = (
        f"UPDATE {table_name} SET da_giao = %s, da_tat_toan = %s, "
        "cong_no_khach = CASE WHEN %s THEN 0 ELSE cong_no_khach END "
        "WHERE id = %s"
    )
    with conn.cursor() as cur:
        cur.execute(sql, (da_giao, da_tat_toan, da_tat_toan, order_id))
        row_count = cur.rowcount
    conn.commit()
    return row_count


def read_order_status(conn, table_name: str, order_id: str):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT da_giao, da_tat_toan, cong_no_khach FROM {table_name} WHERE id = %s",
            (order_id,),
        )
        return cur.fetchone()


class StatusUpdateTests(unittest.TestCase):
    sample_order = None
    sample_table = None
    original = None

    @classmethod
    def setUpClass(cls):
        cls.conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        for table in TABLE_MAP.values():
            with cls.conn.cursor() as cur:
                cur.execute(
                    f"SELECT id, da_giao, da_tat_toan, cong_no_khach FROM {table} "
                    "WHERE (is_quote = FALSE OR is_quote IS NULL) LIMIT 1"
                )
                row = cur.fetchone()
                if row:
                    cls.sample_order = row[0]
                    cls.sample_table = table
                    cls.original = {
                        "da_giao": row[1],
                        "da_tat_toan": row[2],
                        "cong_no_khach": row[3],
                    }
                    break
        if not cls.sample_order:
            raise unittest.SkipTest("No sample order found in database")

    @classmethod
    def tearDownClass(cls):
        if cls.conn and cls.sample_order and cls.original:
            with cls.conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {cls.sample_table} SET da_giao = %s, da_tat_toan = %s, cong_no_khach = %s WHERE id = %s",
                    (
                        cls.original["da_giao"],
                        cls.original["da_tat_toan"],
                        cls.original["cong_no_khach"],
                        cls.sample_order,
                    ),
                )
            cls.conn.commit()
        if cls.conn:
            cls.conn.close()

    def test_table_name_mapping(self):
        self.assertEqual(get_stats_table_name("bang-keo-in"), "bang_keo_in_orders")
        self.assertEqual(get_stats_table_name("truc-in"), "truc_in_orders")
        self.assertEqual(get_stats_table_name("bang-keo"), "bang_keo_orders")

    def test_update_correct_table_persists(self):
        new_giao = not bool(self.original["da_giao"])
        row_count = update_order_status(
            self.conn, self.sample_table, self.sample_order, new_giao, bool(self.original["da_tat_toan"])
        )
        self.assertEqual(row_count, 1, "UPDATE must affect exactly 1 row")
        da_giao, da_tat_toan, _ = read_order_status(self.conn, self.sample_table, self.sample_order)
        self.assertEqual(bool(da_giao), new_giao)

    def test_update_wrong_table_returns_zero_rows(self):
        wrong_table = "truc_in_orders" if self.sample_table != "truc_in_orders" else "bang_keo_orders"
        with self.conn.cursor() as cur:
            cur.execute(
                f"UPDATE {wrong_table} SET da_giao = %s WHERE id = %s",
                (True, self.sample_order),
            )
            row_count = cur.rowcount
        self.conn.rollback()
        self.assertEqual(row_count, 0, "Wrong table must not update any row")

    def test_settlement_clears_debt(self):
        row_count = update_order_status(self.conn, self.sample_table, self.sample_order, True, True)
        self.assertEqual(row_count, 1)
        _, da_tat_toan, cong_no = read_order_status(self.conn, self.sample_table, self.sample_order)
        self.assertTrue(da_tat_toan)
        self.assertEqual(float(cong_no or 0), 0.0)

    def test_success_requires_row_count_gt_zero(self):
        """Mirrors frontend fix: res.ok alone is not enough."""
        res_ok = True
        row_count = 0
        success = res_ok and row_count > 0
        self.assertFalse(success)

        row_count = 1
        success = res_ok and row_count > 0
        self.assertTrue(success)


class SettlementHelperTests(unittest.TestCase):
    def test_apply_settlement_debt_clears_when_settled(self):
        class Order:
            da_tat_toan = True
            cong_no_khach = 1_500_000

        order = Order()
        apply_settlement_debt(order)
        self.assertEqual(order.cong_no_khach, 0)

    def test_apply_settlement_debt_keeps_debt_when_unsettled(self):
        class Order:
            da_tat_toan = False
            cong_no_khach = 1_500_000

        order = Order()
        apply_settlement_debt(order)
        self.assertEqual(order.cong_no_khach, 1_500_000)


class InconsistentDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.conn = psycopg2.connect(DATABASE_URL, sslmode="require")

    @classmethod
    def tearDownClass(cls):
        if cls.conn:
            cls.conn.close()

    def test_no_settled_orders_with_open_debt(self):
        repaired = repair_settled_orders_debt(self.conn)
        if repaired:
            print(f"Repaired {repaired} settled orders with stale debt")

        total = 0
        with self.conn.cursor() as cur:
            for table in TABLE_MAP.values():
                cur.execute(
                    f"SELECT COUNT(*) FROM {table} "
                    "WHERE COALESCE(da_tat_toan, FALSE) = TRUE AND COALESCE(cong_no_khach, 0) > 0"
                )
                total += cur.fetchone()[0]
        self.assertEqual(total, 0, f"Found {total} settled orders still carrying debt")


if __name__ == "__main__":
    result = unittest.main(verbosity=2, exit=False)
    sys.exit(0 if result.result.wasSuccessful() else 1)
