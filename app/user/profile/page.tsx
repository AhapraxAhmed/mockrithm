"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/firebase/client"
import type { User } from "@/app/user/types"
import { getUserData } from "../lib/firestore"
import { ProfileForm } from "../components/ProfileForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProfileSkeleton } from "../components/Skeletons"
import { Trash2, UserIcon, Mail, ExternalLink } from "lucide-react"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/firebase/client"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [user] = useAuthState(auth)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    )
      return;
      
    try {
      setLoading(true);
      // Delete interviews
      const interviewsRef = collection(db, "users", user.uid, "interviews");
      const interviewDocs = await getDocs(interviewsRef);
      await Promise.all(interviewDocs.docs.map((d) => deleteDoc(d.ref)));
      
      // Delete user doc
      await deleteDoc(doc(db, "users", user.uid));
      
      // Delete Firebase Auth user
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.delete();
      }
      
      await signOut(auth);
      router.push("/sign-in");
    } catch (error) {
      console.error("Account deletion failed:", error);
      alert("Failed to delete account. You might need to re-authenticate (sign out and in) before deleting.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return

      try {
        setLoading(true)
        const result = await getUserData(user.uid)
        setUserData(result)
      } catch (err) {
        setError("Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const handleUserUpdate = (updatedUser: User) => {
    setUserData(updatedUser)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-200">Manage your account information</p>
        </div>
        <ProfileSkeleton />
      </div>
    )
  }

  if (error || !userData) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-700">{error || "Profile not found"}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-200">Manage your account information</p>
        </div>
        <ProfileForm user={userData} onUpdate={handleUserUpdate} />
      </div>

      <Card className="max-w-2xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <UserIcon className="mr-2 h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-white">Name:</span>
            <span className="font-medium text-white">{userData.name}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-white">Email:</span>
            <span className="font-medium text-white flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              {userData.email}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-white">Role:</span>
<span className="font-medium text-white">{userData?.role || "User"}</span>
          </div>

          {userData.resumeLink && (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Resume:</span>
              <a
                href={userData.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-black hover:text-gray-700 flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Resume
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-6 border-t border-gray-700">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Danger Zone</h3>
          <p className="text-gray-400 text-sm mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-600/20"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
