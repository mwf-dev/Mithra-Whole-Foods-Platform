"use client"

import React from "react"

import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

// Medusa's store API does not support changing the sign-in email, so this is
// intentionally read-only. The previous editable form pretended to succeed
// without saving anything.
const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  return (
    <div className="text-small-regular w-full" data-testid="account-email-editor">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="uppercase text-ui-fg-base">Email</span>
          <span className="font-semibold" data-testid="current-info">
            {customer.email}
          </span>
        </div>
      </div>
      <span className="text-ui-fg-muted text-xs mt-2 block">
        Your email is used to sign in and can&apos;t be changed here. Contact
        support if you need to update it.
      </span>
    </div>
  )
}

export default ProfileEmail
