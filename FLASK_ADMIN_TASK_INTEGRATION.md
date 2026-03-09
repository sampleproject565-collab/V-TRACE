# Flask Admin - Task Management Integration

## Overview
This guide shows how to integrate your Flask admin panel with the React Native app for task management.

---

## Firebase Database Structure

### Tasks Collection Schema
```json
{
  "tasks": {
    "task_id_123": {
      "title": "Visit 5 farmers in North District",
      "description": "Meet with farmers to discuss new fertilizer products",
      "priority": "high",
      "status": "pending",
      "assignedTo": "EMP001",
      "assignedBy": "admin@company.com",
      "dueDate": "2026-03-10T00:00:00.000Z",
      "createdAt": "2026-03-09T10:30:00.000Z",
      "updatedAt": "2026-03-09T10:30:00.000Z"
    }
  }
}
```

### Task Status Flow
```
pending → accepted → completed
   ↓
rejected (with reason)
   ↓
not_completed (with reason)
```

---

## Flask Backend Implementation

### 1. Install Firebase Admin SDK

```bash
pip install firebase-admin
```

### 2. Initialize Firebase in Flask

```python
# app.py or config.py
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://your-project.firebase.io.com'
})
```

### 3. Create Task Management Routes

```python
# routes/tasks.py
from flask import Blueprint, request, jsonify, render_template
from firebase_admin import db
from datetime import datetime
import uuid

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/admin/tasks', methods=['GET'])
def list_tasks():
    """Display all tasks in admin panel"""
    ref = db.reference('tasks')
    tasks = ref.get() or {}
    
    # Convert to list for template
    tasks_list = [{'id': k, **v} for k, v in tasks.items()]
    tasks_list.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
    
    return render_template('admin/tasks.html', tasks=tasks_list)

@tasks_bp.route('/admin/tasks/create', methods=['GET', 'POST'])
def create_task():
    """Create new task"""
    if request.method == 'POST':
        data = request.form
        
        task_id = str(uuid.uuid4())
        task_data = {
            'title': data['title'],
            'description': data['description'],
            'priority': data['priority'],  # low, medium, high
            'status': 'pending',
            'assignedTo': data['employee_id'],
            'assignedBy': request.user.email,  # Your auth system
            'dueDate': data['due_date'] + 'T00:00:00.000Z',
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        # Save to Firebase
        ref = db.reference(f'tasks/{task_id}')
        ref.set(task_data)
        
        return jsonify({'success': True, 'task_id': task_id})
    
    # GET: Show form
    employees = get_employees()  # Your function to get employees
    return render_template('admin/create_task.html', employees=employees)

@tasks_bp.route('/admin/tasks/<task_id>', methods=['GET'])
def view_task(task_id):
    """View task details"""
    ref = db.reference(f'tasks/{task_id}')
    task = ref.get()
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    task['id'] = task_id
    return render_template('admin/view_task.html', task=task)

@tasks_bp.route('/admin/tasks/<task_id>/delete', methods=['POST'])
def delete_task(task_id):
    """Delete task"""
    ref = db.reference(f'tasks/{task_id}')
    ref.delete()
    
    return jsonify({'success': True})

@tasks_bp.route('/api/tasks/employee/<employee_id>', methods=['GET'])
def get_employee_tasks(employee_id):
    """API endpoint to get tasks for specific employee"""
    ref = db.reference('tasks')
    all_tasks = ref.get() or {}
    
    # Filter by employee
    employee_tasks = {
        k: v for k, v in all_tasks.items() 
        if v.get('assignedTo') == employee_id
    }
    
    return jsonify(employee_tasks)

def get_employees():
    """Get list of employees from Firebase"""
    ref = db.reference('employees')
    employees = ref.get() or {}
    return [{'id': k, **v} for k, v in employees.items()]
```

---

## HTML Templates

### 1. Create Task Form (`templates/admin/create_task.html`)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Create Task</title>
    <style>
        .form-group { margin-bottom: 15px; }
        label { display: block; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 8px; }
        .btn { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Create New Task</h1>
    
    <form method="POST" action="/admin/tasks/create">
        <div class="form-group">
            <label>Task Title *</label>
            <input type="text" name="title" required>
        </div>
        
        <div class="form-group">
            <label>Description *</label>
            <textarea name="description" rows="4" required></textarea>
        </div>
        
        <div class="form-group">
            <label>Assign To *</label>
            <select name="employee_id" required>
                <option value="">Select Employee</option>
                {% for emp in employees %}
                <option value="{{ emp.id }}">{{ emp.name }} ({{ emp.id }})</option>
                {% endfor %}
            </select>
        </div>
        
        <div class="form-group">
            <label>Priority *</label>
            <select name="priority" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Due Date *</label>
            <input type="date" name="due_date" required>
        </div>
        
        <button type="submit" class="btn">Create Task</button>
    </form>
</body>
</html>
```

### 2. Task List (`templates/admin/tasks.html`)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Tasks Management</title>
    <style>
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .status-pending { color: #FF9800; }
        .status-accepted { color: #2196F3; }
        .status-completed { color: #4CAF50; }
        .status-rejected { color: #f44336; }
        .priority-high { background: #ffebee; }
        .priority-medium { background: #fff3e0; }
        .priority-low { background: #e8f5e9; }
    </style>
</head>
<body>
    <h1>Tasks Management</h1>
    <a href="/admin/tasks/create" class="btn">Create New Task</a>
    
    <table>
        <thead>
            <tr>
                <th>Title</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            {% for task in tasks %}
            <tr class="priority-{{ task.priority }}">
                <td>{{ task.title }}</td>
                <td>{{ task.assignedTo }}</td>
                <td>{{ task.priority|upper }}</td>
                <td class="status-{{ task.status }}">{{ task.status|upper }}</td>
                <td>{{ task.dueDate[:10] }}</td>
                <td>
                    <a href="/admin/tasks/{{ task.id }}">View</a> |
                    <a href="#" onclick="deleteTask('{{ task.id }}')">Delete</a>
                </td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    
    <script>
        function deleteTask(taskId) {
            if (confirm('Are you sure you want to delete this task?')) {
                fetch(`/admin/tasks/${taskId}/delete`, { method: 'POST' })
                    .then(() => location.reload());
            }
        }
    </script>
</body>
</html>
```

---

## Quick Start Guide

### 1. Setup Firebase Admin

```bash
# Install dependencies
pip install firebase-admin flask

# Download service account key from Firebase Console
# Settings → Service Accounts → Generate New Private Key
```

### 2. Add to Flask App

```python
# app.py
from flask import Flask
from routes.tasks import tasks_bp
import firebase_admin
from firebase_admin import credentials

app = Flask(__name__)

# Initialize Firebase
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://your-project.firebaseio.com'
})

# Register blueprint
app.register_blueprint(tasks_bp)

if __name__ == '__main__':
    app.run(debug=True)
```

### 3. Create Task from Admin

```python
# Example: Create task via Python script
from firebase_admin import db
from datetime import datetime, timedelta
import uuid

def create_daily_task(employee_id, title, description):
    task_id = str(uuid.uuid4())
    tomorrow = datetime.now() + timedelta(days=1)
    
    task_data = {
        'title': title,
        'description': description,
        'priority': 'medium',
        'status': 'pending',
        'assignedTo': employee_id,
        'assignedBy': 'admin',
        'dueDate': tomorrow.isoformat() + 'Z',
        'createdAt': datetime.utcnow().isoformat() + 'Z',
        'updatedAt': datetime.utcnow().isoformat() + 'Z'
    }
    
    ref = db.reference(f'tasks/{task_id}')
    ref.set(task_data)
    print(f"Task created: {task_id}")

# Usage
create_daily_task('EMP001', 'Visit 5 farmers', 'Meet farmers in North District')
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/tasks` | List all tasks |
| GET | `/admin/tasks/create` | Show create form |
| POST | `/admin/tasks/create` | Create new task |
| GET | `/admin/tasks/<id>` | View task details |
| POST | `/admin/tasks/<id>/delete` | Delete task |
| GET | `/api/tasks/employee/<id>` | Get employee tasks (API) |

---

## Mobile App Workflow

### User Experience:

1. **Dashboard** → Shows pending tasks count
2. **Employees Tab** → Click "My Tasks" module
3. **Task List** → See all assigned tasks
4. **Pending Task** → Accept or Reject (with reason)
5. **Accepted Task** → Mark as Complete or Not Complete (with reason)
6. **Admin** → Sees all status updates in real-time

---

## Testing

### 1. Create Test Task (Python)

```python
from firebase_admin import db
import uuid
from datetime import datetime

task_id = str(uuid.uuid4())
ref = db.reference(f'tasks/{task_id}')
ref.set({
    'title': 'Test Task',
    'description': 'This is a test task',
    'priority': 'high',
    'status': 'pending',
    'assignedTo': 'EMP001',  # Your employee ID
    'assignedBy': 'admin',
    'dueDate': '2026-03-10T00:00:00.000Z',
    'createdAt': datetime.utcnow().isoformat() + 'Z',
    'updatedAt': datetime.utcnow().isoformat() + 'Z'
})
print(f"Test task created: {task_id}")
```

### 2. Check in Mobile App

- Open app → Employees → My Tasks
- You should see the test task
- Try Accept/Reject/Complete workflow

---

## Real-Time Updates

Tasks update in real-time using Firebase listeners. When admin creates/updates a task, the mobile app automatically refreshes.

---

## Security Rules (Firebase)

```json
{
  "rules": {
    "tasks": {
      "$taskId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## Summary

✅ Flask admin creates tasks
✅ Tasks sync to Firebase
✅ Mobile app shows tasks in real-time
✅ Users can accept/reject/complete
✅ Reasons captured for rejections/incomplete
✅ Admin sees all updates instantly

The system is production-ready! 🚀
