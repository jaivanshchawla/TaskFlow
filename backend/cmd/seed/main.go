package main

import (
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/database"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load()
	logger.Init("development", "debug")

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgresql://taskflow:taskflow_secret@postgres:5432/taskflow_db"
	}

	db := database.Connect(databaseURL)
	database.Migrate(db)

	fmt.Println("🌱 Seeding database...")

	var userCount, labelCount, taskCount, subtaskCount, commentCount, attachmentCount, activityCount int

	// 1. Create users
	adminUser := upsertUser(db, models.User{
		ClerkUserID: "seed_admin_clerk_001",
		Email:       "admin@taskflow.dev",
		Name:        "Admin User",
		Role:        "admin",
		AvatarURL:   "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
	})
	userCount++

	demoUser := upsertUser(db, models.User{
		ClerkUserID: "seed_demo_clerk_001",
		Email:       "demo@taskflow.dev",
		Name:        "Demo User",
		Role:        "user",
		AvatarURL:   "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
	})
	userCount++

	// 2. Create preferences
	upsertPreferences(db, adminUser.ID, "system", "list", 20)
	upsertPreferences(db, demoUser.ID, "dark", "kanban", 20)

	// 3. Create labels for demo user
	labels := []struct {
		Name  string
		Color string
	}{
		{"Backend", "#6366f1"},
		{"Frontend", "#f59e0b"},
		{"Bug", "#ef4444"},
		{"Feature", "#10b981"},
		{"Urgent", "#f97316"},
	}

	labelModels := make(map[string]models.Label)
	for _, l := range labels {
		label := upsertLabel(db, demoUser.ID, l.Name, l.Color)
		labelModels[l.Name] = label
		labelCount++
	}

	// 4. Create tasks
	type taskData struct {
		Title       string
		Status      string
		Priority    string
		DaysFromNow int
		Labels      []string
	}

	tasks := []taskData{
		{"Set up CI/CD pipeline", "todo", "medium", 0, []string{"Backend"}},
		{"Write project documentation", "todo", "low", 0, []string{"Frontend"}},
		{"Review pull requests", "todo", "low", 0, []string{}},
		{"Implement user authentication", "in_progress", "high", 5, []string{"Backend", "Feature"}},
		{"Build dashboard analytics", "in_progress", "medium", 7, []string{"Frontend", "Feature"}},
		{"Fix mobile responsive layout", "in_progress", "high", 3, []string{"Frontend", "Bug"}},
		{"Integrate payment gateway", "in_progress", "medium", 10, []string{"Backend", "Feature"}},
		{"API performance optimization", "in_progress", "urgent", -1, []string{"Backend", "Urgent"}},
		{"Design system review", "in_review", "high", 1, []string{"Frontend"}},
		{"Security audit", "in_review", "high", 2, []string{"Backend", "Urgent"}},
		{"Launch v1.0 release", "done", "high", -5, []string{"Feature"}},
		{"User onboarding flow", "done", "medium", -10, []string{"Frontend", "Feature"}},
		{"Database schema migration", "done", "low", -3, []string{"Backend"}},
		{"Legacy API deprecation", "cancelled", "low", 0, []string{"Backend"}},
		{"Third-party analytics integration", "cancelled", "medium", 0, []string{"Frontend"}},
	}

	taskModels := make([]models.Task, 0, len(tasks))
	for i, td := range tasks {
		var dueDate *time.Time
		if td.DaysFromNow != 0 {
			d := time.Now().AddDate(0, 0, td.DaysFromNow)
			dueDate = &d
		}

		task := models.Task{
			UserID:   demoUser.ID,
			Title:    td.Title,
			Status:   td.Status,
			Priority: td.Priority,
			DueDate:  dueDate,
			Position: i,
		}
		db.Create(&task)
		taskModels = append(taskModels, task)
		taskCount++

		for _, labelName := range td.Labels {
			if label, ok := labelModels[labelName]; ok {
				db.Exec("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?) ON CONFLICT DO NOTHING", task.ID, label.ID)
			}
		}

		db.Create(&models.ActivityLog{
			TaskID:   task.ID,
			UserID:   demoUser.ID,
			Action:   "task_created",
			NewValue: stringPtr(fmt.Sprintf(`"%s"`, td.Title)),
		})
		activityCount++
	}

	// 5. Create subtasks
	subtaskData := map[int][]string{
		0: {"Configure GitHub Actions", "Set up test environment"},
		3: {"Set up Clerk project", "Configure JWT middleware", "Write auth tests"},
		4: {"Create stats cards", "Build recharts components"},
		5: {"Fix header on mobile", "Adjust sidebar breakpoints"},
		8: {"Review color palette", "Check component library"},
		10: {"Deploy to production", "Verify all endpoints"},
		11: {"Design onboarding screens", "Implement welcome flow"},
	}

	for taskIdx, titles := range subtaskData {
		if taskIdx >= len(taskModels) {
			continue
		}
		for i, title := range titles {
			completed := i == 0 && taskIdx == 10
			db.Create(&models.Subtask{
				TaskID:    taskModels[taskIdx].ID,
				Title:     title,
				Completed: completed,
				Position:  i,
			})
			subtaskCount++
		}
	}

	// 6. Create comments
	commentData := []struct {
		TaskIdx int
		Content string
	}{
		{3, "This is looking great! The auth flow is smooth."},
		{3, "Can we add MFA support as well?"},
		{3, "Good idea, I'll add it to the backlog."},
		{5, "The mobile layout needs some work on smaller screens."},
		{5, "I've pushed a fix for the header issue."},
		{11, "Release is ready to go! All tests passing."},
		{11, "Deployed successfully to production 🎉"},
	}

	for _, cd := range commentData {
		if cd.TaskIdx >= len(taskModels) {
			continue
		}
		db.Create(&models.Comment{
			TaskID:  taskModels[cd.TaskIdx].ID,
			UserID:  demoUser.ID,
			Content: cd.Content,
		})
		commentCount++
	}

	// 7. Create attachments
	attachmentData := []struct {
		TaskIdx  int
		FileName string
		FileType string
		FileSize int64
	}{
		{4, "dashboard-mockup.png", "image/png", 204800},
		{8, "performance-report.pdf", "application/pdf", 1048576},
	}

	for _, ad := range attachmentData {
		if ad.TaskIdx >= len(taskModels) {
			continue
		}
		db.Create(&models.Attachment{
			TaskID:   taskModels[ad.TaskIdx].ID,
			UserID:   demoUser.ID,
			FileName: ad.FileName,
			FileURL:  "https://storage.example.com/uploads/" + ad.FileName,
			FileSize: ad.FileSize,
			FileType: ad.FileType,
		})
		attachmentCount++
	}

	fmt.Println()
	fmt.Println("✅ Seed complete")
	fmt.Printf("   Users:       %d\n", userCount)
	fmt.Printf("   Labels:      %d\n", labelCount)
	fmt.Printf("   Tasks:       %d\n", taskCount)
	fmt.Printf("   Subtasks:    %d\n", subtaskCount)
	fmt.Printf("   Comments:    %d\n", commentCount)
	fmt.Printf("   Attachments: %d\n", attachmentCount)
	fmt.Printf("   Activity:    %d\n", activityCount)
}

func upsertUser(db *gorm.DB, user models.User) models.User {
	var existing models.User
	result := db.Where("email = ?", user.Email).First(&existing)
	if result.Error == gorm.ErrRecordNotFound {
		db.Create(&user)
		return user
	}
	return existing
}

func upsertPreferences(db *gorm.DB, userID uuid.UUID, theme, defaultView string, itemsPerPage int) {
	var existing models.UserPreferences
	result := db.Where("user_id = ?", userID).First(&existing)
	if result.Error == gorm.ErrRecordNotFound {
		db.Create(&models.UserPreferences{
			UserID:       userID,
			Theme:        theme,
			DefaultView:  defaultView,
			ItemsPerPage: itemsPerPage,
		})
	}
}

func upsertLabel(db *gorm.DB, userID uuid.UUID, name, color string) models.Label {
	var existing models.Label
	result := db.Where("user_id = ? AND name = ?", userID, name).First(&existing)
	if result.Error == gorm.ErrRecordNotFound {
		label := models.Label{
			UserID: userID,
			Name:   name,
			Color:  color,
		}
		db.Create(&label)
		return label
	}
	return existing
}

func stringPtr(s string) *string {
	return &s
}
