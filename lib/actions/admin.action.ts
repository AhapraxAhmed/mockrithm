"use server";

import { db } from "@/firebase/admin";

export async function getAdminMetrics() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const collections = [
      { name: "users", dateField: "createdAt" },
      { name: "interviewsfeedback", dateField: "createdAt" },
      { name: "sessions", dateField: "startedAt" },
    ];

    const metricsPromises = collections.map(async (col) => {
      const totalCount = (await db.collection(col.name).count().get()).data().count;

      // Note: This relies on dateField being a Firestore Timestamp or Date object
      // For existing ISO strings, this might skip them. 
      const thisMonthCount = (
        await db
          .collection(col.name)
          .where(col.dateField, ">=", thirtyDaysAgo)
          .count()
          .get()
      ).data().count;

      const lastMonthCount = (
        await db
          .collection(col.name)
          .where(col.dateField, ">=", sixtyDaysAgo)
          .where(col.dateField, "<", thirtyDaysAgo)
          .count()
          .get()
      ).data().count;

      let change = 0;
      if (lastMonthCount > 0) {
        change = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
      } else if (thisMonthCount > 0) {
        change = 100; // 100% growth if prev was 0
      }

      return {
        total: totalCount,
        change: change.toFixed(1),
        isPositive: change >= 0,
      };
    });

    const [userMetrics, feedbackMetrics, sessionMetrics] = await Promise.all(
      metricsPromises
    );

    return {
      success: true,
      data: {
        users: userMetrics,
        feedbacks: feedbackMetrics,
        sessions: sessionMetrics,
      },
    };
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

export async function getRecentActivity() {
  try {
    const [usersSnap, feedbackSnap] = await Promise.all([
      db.collection("users").orderBy("createdAt", "desc").limit(10).get(),
      db.collection("interviewsfeedback").orderBy("createdAt", "desc").limit(10).get(),
    ]);

    const recentUsers = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate
        ? doc.data().createdAt.toDate().toISOString()
        : doc.data().createdAt, // Fallback for ISO strings
    }));

    const recentFeedbacks = feedbackSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate
        ? doc.data().createdAt.toDate().toISOString()
        : doc.data().createdAt,
    }));

    return {
      success: true,
      data: {
        recentUsers,
        recentFeedbacks,
      },
    };
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return { success: false, error: "Failed to fetch activity" };
  }
}

export async function resetSessions() {
  try {
    const batchSize = 500;
    const collectionRef = db.collection("sessions");
    const query = collectionRef.orderBy("__name__").limit(batchSize);

    return new Promise((resolve, reject) => {
      deleteQueryBatch(query, resolve).catch(reject);
    });

    async function deleteQueryBatch(query: any, resolve: any) {
      const snapshot = await query.get();

      const batchSize = snapshot.size;
      if (batchSize === 0) {
        resolve();
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      process.nextTick(() => {
        deleteQueryBatch(query, resolve);
      });
    }
  } catch (error) {
    console.error("Error resetting sessions:", error);
    return { success: false, error: "Failed to reset sessions" };
  }
}
