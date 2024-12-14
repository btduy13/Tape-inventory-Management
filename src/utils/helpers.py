from datetime import datetime

def convert_order_to_preview_data(order):
    """Convert database order object to preview data format"""
    if hasattr(order, 'quy_cach_mm'):  # BangKeoInOrder
        specs = f"{int(order.quy_cach_mm)}x{int(order.quy_cach_m)}x{int(order.quy_cach_mic)}"
    else:  # TrucInOrder
        specs = order.quy_cach

    return {
        'product': order.ten_hang,
        'specs': specs,
        'text_color': '',  # Will be input by user
        'bg_color': '',    # Will be input by user
        'unit': '',        # Will be input by user
        'quantity': str(order.so_luong),
        'price': str(order.don_gia_ban),
        'total': str(order.thanh_tien_ban)
    }

def apply_row_colors(tree):
    """Apply alternating row colors to treeview"""
    items = tree.get_children()
    for i, item in enumerate(items):
        if i % 2 == 0:
            tree.tag_configure('evenrow', background='#FFFFFF')
            tree.item(item, tags=('evenrow',))
        else:
            tree.tag_configure('oddrow', background='#F0F0F0')
            tree.item(item, tags=('oddrow',))

def sort_treeview_items(tree, col, reverse=False):
    """Sort treeview items based on column values"""
    items = [(tree.set(item, col), item) for item in tree.get_children('')]
    
    if col in ('quantity', 'price'):
        # Convert string numbers with commas to float for sorting
        items.sort(key=lambda x: float(x[0].replace(',', '')), reverse=reverse)
    elif col == 'date':
        # Convert date strings to datetime objects for sorting
        items.sort(key=lambda x: datetime.strptime(x[0], '%d/%m/%Y'), reverse=reverse)
    else:
        # Regular string sorting for other columns
        items.sort(key=lambda x: x[0].lower(), reverse=reverse)
    
    # Rearrange items in treeview
    for index, (val, item) in enumerate(items):
        tree.move(item, '', index)
    
    return items 