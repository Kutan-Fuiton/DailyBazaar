import numpy as np

# Helper Functions 

def get_x_center(bbox):
    return (bbox[0][0] + bbox[2][0]) / 2

def get_y_center(bbox):
    return (bbox[0][1] + bbox[2][1]) / 2


# Adaptive Threshold 

def get_threshold(values, scale=1.5, default=50):
    if len(values) < 2:
        return default

    values = sorted(values)
    gaps = [values[i+1] - values[i] for i in range(len(values)-1)]

    return np.median(gaps) * scale


# Column Clustering

def cluster_columns(results):
    x_centers = [get_x_center(b) for b, _, _ in results]
    x_thresh = get_threshold(x_centers)

    columns = []

    for bbox, text, conf in results:
        x = get_x_center(bbox)

        placed = False
        for col in columns:
            if abs(col['x'] - x) < x_thresh:
                col['words'].append((bbox, text, conf))
                placed = True
                break

        if not placed:
            columns.append({
                'x': x,
                'words': [(bbox, text, conf)]
            })

    # sort left -> right
    columns = sorted(columns, key=lambda c: c['x'])

    return columns


# COlumn type classification

def is_numeric_column(col):
    texts = [w[1] for w in col['words']]
    count = sum(any(c.isdigit() for c in t) for t in texts)

    return (count / len(texts)) > 0.6


def classify_columns(columns):
    col_types = []

    for col in columns:
        if is_numeric_column(col):
            col_types.append("number")
        else:
            col_types.append("text")

    return col_types


# Row Grouping

def group_lines(results):
    y_centers = [get_y_center(b) for b, _, _ in results]
    y_thresh = get_threshold(y_centers, scale=1.2, default=40)

    rows = []

    results = sorted(results, key=lambda x: get_y_center(x[0]))

    for bbox, text, conf in results:
        y = get_y_center(bbox)

        placed = False

        for row in rows:
            if abs(row['y'] - y) < y_thresh:
                row['words'].append((bbox, text, conf))
                placed = True
                break

        if not placed:
            rows.append({
                'y': y,
                'words': [(bbox, text, conf)]
            })

    # sort each row left -> right
    for row in rows:
        row['words'] = sorted(row['words'], key=lambda x: get_x_center(x[0]))

    return rows


# MAIN STRUCTURE FUNCTION 

def build_structure(results):
    columns = cluster_columns(results)
    col_types = classify_columns(columns)
    rows = group_lines(results)

    return columns, col_types, rows