#!/bin/bash

# AgentHR Production Management Script
# Usage: ./scripts/production.sh [command]
#
# Commands:
#   start     - Start the application
#   stop      - Stop the application
#   restart   - Restart the application
#   status    - Show application status
#   logs      - View application logs

set -e

APP_NAME="agenthr"
LOG_DIR="./logs"
PID_FILE="${LOG_DIR}/${APP_NAME}.pid"
OUT_LOG="${LOG_DIR}/${APP_NAME}-out.log"
ERR_LOG="${LOG_DIR}/${APP_NAME}-error.log"

mkdir -p "$LOG_DIR"

get_pid() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

case "$1" in
  start)
    if pid=$(get_pid); then
      echo "AgentHR is already running (PID: $pid)"
      exit 0
    fi

    if [ ! -f "dist/index.js" ]; then
      echo "Error: dist/index.js not found. Run 'npm run build' first."
      exit 1
    fi

    echo "Starting AgentHR..."
    NODE_ENV=production PORT=${PORT:-5000} nohup node dist/index.js >> "$OUT_LOG" 2>> "$ERR_LOG" &
    echo $! > "$PID_FILE"
    echo "AgentHR started (PID: $!). Logs: $OUT_LOG"
    ;;

  stop)
    if pid=$(get_pid); then
      echo "Stopping AgentHR (PID: $pid)..."
      kill -SIGTERM "$pid"
      for i in $(seq 1 10); do
        if ! kill -0 "$pid" 2>/dev/null; then
          echo "AgentHR stopped."
          rm -f "$PID_FILE"
          exit 0
        fi
        sleep 1
      done
      echo "Force killing AgentHR..."
      kill -9 "$pid" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "AgentHR stopped (forced)."
    else
      echo "AgentHR is not running."
    fi
    ;;

  restart)
    echo "Restarting AgentHR..."
    $0 stop
    sleep 1
    $0 start
    ;;

  status)
    if pid=$(get_pid); then
      echo "AgentHR is running (PID: $pid)"
      if command -v ps &>/dev/null; then
        ps -p "$pid" -o pid,rss,pcpu,etime --no-headers 2>/dev/null | awk '{printf "  PID: %s | Memory: %.1f MB | CPU: %s%% | Uptime: %s\n", $1, $2/1024, $3, $4}'
      fi
    else
      echo "AgentHR is not running."
    fi
    ;;

  logs)
    echo "Showing AgentHR logs (Ctrl+C to exit)..."
    tail -f "$OUT_LOG" "$ERR_LOG"
    ;;

  *)
    echo "AgentHR Production Management"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the application"
    echo "  stop    - Stop the application"
    echo "  restart - Restart the application"
    echo "  status  - Show application status"
    echo "  logs    - View application logs (live)"
    echo ""
    exit 1
    ;;
esac
