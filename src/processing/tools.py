import os.path
import glob
import json
import sqlite3
import pandas as pd
import definitions

def check_if_path_exists(path):
  try:
    os.makedirs(path)
  except OSError:
    if not os.path.isdir(path):
      raise

def build_sql_query(params):
  sql = "SELECT * FROM vehicles"
  # should fix: bug if wrong args passed
  if len(params) > 0:
    sql += " WHERE "
    conditions = []
    #if 'rt' in params:
    #  conditions.append("rt=:rt")
    if 'start_date' in params:
      conditions.append("tmstmp >= :start_date")
    if 'end_date' in params:
      conditions.append("tmstmp < :end_date")
    sql += " AND ".join(conditions)
  sql += ";"
  return sql

def load_raw_data(rt, **kwargs):
  params = {k:v for k,v in kwargs.items() if v is not None}
  sql = build_sql_query(params)
  db_path = os.path.join(definitions.VEHICLES_DIR, "route{}.db".format(rt))
  with sqlite3.connect(db_path) as conn:
    df = pd.read_sql_query(sql, conn, params=params)
  return df

def load_routes():
  with open(os.path.join(definitions.ROUTES_DIR, "routes.json")) as f:
    rts_json = json.load(f)
  routes = [rts.get('rt') for rts in rts_json.get('bustime-response').get('routes')]
  return routes

def load_patterns(rt, waypoints):
  dfs = []
  for file in glob.glob(os.path.join(definitions.PATTERNS_DIR, "{}_*".format(rt))):
    with open(file) as f:
      pattern_json = json.load(f)
    if not waypoints:
      stops = [stop for stop in pattern_json.get('pt') if stop.get('typ') != "W"]
    else:
      stops = pattern_json.get('pt')
    df = pd.DataFrame(stops)
    pattern_json.pop('pt')
    dfs.append(df.assign(**pattern_json))
  patterns = pd.concat(dfs, ignore_index=True)
  #patterns.pid = patterns.pid.astype(str)
  return patterns

def load_timetable(rt, tag):
  timetable_path = os.path.join(definitions.TIMETABLES_DIR, "{}_{}_timetable.csv".format(rt, tag))
  
  timetable = pd.read_csv(timetable_path)
  patterns = load_patterns(rt, False)
  stop_list = list(patterns.stpid.unique())
  convert_cols = stop_list + ["start_date"]
  timetable[convert_cols] = timetable[convert_cols].apply(pd.to_datetime)
  return timetable

def load_travels_waits(rt, rtdir, tag):
  tw_path = os.path.join(definitions.TRAVELS_WAITS_DIR, "{}_{}_{}_travels_waits.csv".format(rt, rtdir, tag))
  travels_waits = pd.read_csv(tw_path)
  travels_waits.start_date = pd.to_datetime(travels_waits.start_date)
  return travels_waits

def load_all_dfs(path):
  data_files = glob.glob(path)
  dfs = (pd.read_csv(f) for f in data_files)
  df  = pd.concat(dfs, ignore_index=True)
  return df