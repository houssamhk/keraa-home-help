# UML Diagrams - Sakani Platform (منصة سكني)

## Generated Images
All images are saved in `public/uml/`:
- `use-case-diagram.png` - Use Case Diagram
- `class-diagram.png` - Class Diagram
- `sequence-diagram-rental.png` - Sequence Diagram (Rental Process)
- `sequence-diagram-handyman.png` - Sequence Diagram (Handyman Service)
- `sequence-diagram-admin.png` - Sequence Diagram (Admin Management)
- `activity-diagram.png` - Activity Diagram (Registration & Rental)
- `activity-diagram-admin.png` - Activity Diagram (Admin Operations)
- `state-diagram-contract.png` - State Diagram (Contract Lifecycle)
- `component-diagram.png` - Component Diagram
- `deployment-diagram.png` - Deployment Diagram
- `erd-diagram.png` - Entity Relationship Diagram

---

## 1. Use Case Diagram

> Updated to include comprehensive Admin dashboard, security, and platform management features.

```mermaid
graph TB
    subgraph "Sakani Platform - Use Cases"
        subgraph "Tenant Features"
            UC1["Search Properties"]
            UC2["Book Viewing"]
            UC3["Sign Contract"]
            UC4["Pay Rent / Arrabon"]
            UC5["Request Handyman"]
            UC6["Chat with Owner"]
            UC7["Submit KYC"]
            UC8["Manage Wallet"]
            UC9["Set Search Alert"]
            UC25["Compare Properties"]
            UC26["360 Virtual Tour"]
            UC27["AI Voice Search"]
        end

        subgraph "Owner Features"
            UC10["List Property"]
            UC11["Manage Contracts"]
            UC12["Review Tenants"]
            UC13["Track Payments"]
            UC14["View Analytics"]
            UC15["Feature Listing"]
            UC28["Upload Multi Images"]
            UC29["Export Contract PDF"]
        end

        subgraph "Agency Features"
            UC16["Manage Multiple Listings"]
            UC17["Agency Dashboard"]
            UC18["Subscribe to Package"]
        end

        subgraph "Admin Features"
            UC19["Verify KYC Documents"]
            UC20["Approve/Reject Payments"]
            UC21["Manage Reports & Flags"]
            UC22["View Demand Heatmap"]
            UC23["Manage Users & Roles"]
            UC24["Platform Statistics"]
            UC30["Manage Contracts Admin"]
            UC31["Process Support Requests"]
            UC32["Handle Role Change Requests"]
            UC33["Review Reported Properties"]
            UC34["Review Reported Handymen"]
            UC35["Security Audit & Scanning"]
            UC36["Manage Appointments"]
            UC37["Assign Admin Roles"]
        end
    end

    Tenant((Tenant))
    Owner((Owner))
    Agency((Agency))
    Admin((Admin))

    Tenant --> UC1
    Tenant --> UC2
    Tenant --> UC3
    Tenant --> UC4
    Tenant --> UC5
    Tenant --> UC6
    Tenant --> UC7
    Tenant --> UC8
    Tenant --> UC9
    Tenant --> UC25
    Tenant --> UC26
    Tenant --> UC27

    Owner --> UC10
    Owner --> UC11
    Owner --> UC12
    Owner --> UC13
    Owner --> UC14
    Owner --> UC15
    Owner --> UC3
    Owner --> UC28
    Owner --> UC29

    Agency --> UC16
    Agency --> UC17
    Agency --> UC18

    Admin --> UC19
    Admin --> UC20
    Admin --> UC21
    Admin --> UC22
    Admin --> UC23
    Admin --> UC24
    Admin --> UC30
    Admin --> UC31
    Admin --> UC32
    Admin --> UC33
    Admin --> UC34
    Admin --> UC35
    Admin --> UC36
    Admin --> UC37

    UC3 -.->|include| UC7
    UC4 -.->|include| UC8
    UC9 -.->|extend| UC1
    UC15 -.->|extend| UC10
    UC27 -.->|extend| UC1
    UC32 -.->|include| UC23
    UC33 -.->|include| UC21
    UC34 -.->|include| UC21
    UC37 -.->|include| UC35
```

---

## 2. Class Diagram

> Updated with Security, Admin, and Audit classes.

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String full_name
        +String phone
        +String role_type
        +String avatar_url
        +Boolean kyc_verified
        +Float avg_rating
        +Int total_reviews
        +String[] reputation_badges
        +JSON settings
        +register()
        +login()
        +updateProfile()
        +updateSettings()
    }

    class UserRole {
        +UUID id
        +UUID user_id
        +Enum role: admin|moderator|user
        +assignRole()
        +revokeRole()
    }

    class Property {
        +UUID id
        +String title
        +String description
        +Float price
        +String price_period
        +String city
        +String address
        +Int bedrooms
        +Int bathrooms
        +Float area_sqm
        +String property_type
        +Boolean is_available
        +String[] images
        +String[] amenities
        +Float latitude
        +Float longitude
        +create()
        +update()
        +delete()
        +search()
        +toggleAvailability()
    }

    class Contract {
        +UUID id
        +String title
        +String contract_type
        +Date start_date
        +Date end_date
        +Float monthly_amount
        +Float total_amount
        +String status
        +Boolean landlord_signed
        +Boolean tenant_signed
        +String landlord_signature_data
        +String tenant_signature_data
        +Boolean landlord_phone_consent
        +Boolean tenant_phone_consent
        +String terms
        +create()
        +sign()
        +terminate()
        +exportPDF()
        +givePhoneConsent()
    }

    class ServiceRequest {
        +UUID id
        +String service_type
        +String description
        +String status
        +Date preferred_date
        +String preferred_time
        +String address
        +Float estimated_price
        +Float final_price
        +Float latitude
        +Float longitude
        +Int handyman_rating
        +Int client_rating
        +create()
        +accept()
        +start()
        +complete()
        +cancel()
        +rateHandyman()
        +rateClient()
    }

    class KYCVerification {
        +UUID id
        +UUID user_id
        +String id_type
        +String id_front_url
        +String id_back_url
        +String selfie_url
        +String status
        +Date submitted_at
        +Date verified_at
        +String verified_by
        +String rejection_reason
        +submit()
        +verify()
        +reject()
    }

    class Handyman {
        +UUID id
        +UUID user_id
        +String[] specialty
        +String description
        +Float rating
        +Float hourly_rate
        +Boolean is_available
        +Float latitude
        +Float longitude
        +Int service_area_km
        +Int total_reviews
        +updateAvailability()
        +updateLocation()
    }

    class Review {
        +UUID id
        +UUID reviewer_id
        +UUID reviewed_id
        +UUID contract_id
        +Int rating
        +String comment
        +String reviewer_role
        +String[] badges
        +create()
    }

    class Bill {
        +UUID id
        +UUID user_id
        +String bill_type
        +String title
        +Float amount
        +Date due_date
        +String status
        +Boolean recurring
        +Int recurring_day
        +pay()
        +setReminder()
    }

    class Arrabon {
        +UUID id
        +UUID contract_id
        +UUID tenant_id
        +UUID owner_id
        +Float amount
        +String payment_method
        +String status
        +String payment_proof_url
        +String verified_by
        +submit()
        +verify()
        +release()
    }

    class PaymentHistory {
        +UUID id
        +UUID user_id
        +Float amount
        +String currency
        +String payment_method
        +String payment_type
        +String status
        +String payment_proof_url
        +String verified_by
        +String rejection_reason
        +verify()
        +reject()
    }

    class Report {
        +UUID id
        +UUID reporter_id
        +String reported_type
        +UUID reported_id
        +String reason
        +String description
        +String status
        +String admin_notes
        +UUID resolved_by
        +submit()
        +resolve()
        +dismiss()
    }

    class SupportRequest {
        +UUID id
        +UUID user_id
        +String request_type
        +String from_role
        +String to_role
        +String reason
        +String status
        +String admin_notes
        +UUID processed_by
        +submit()
        +approve()
        +reject()
    }

    class Notification {
        +UUID id
        +UUID user_id
        +String title
        +String message
        +String type
        +Boolean is_read
        +JSON data
        +send()
        +markRead()
    }

    class Conversation {
        +UUID id
        +UUID participant_1
        +UUID participant_2
        +UUID property_id
        +DateTime last_message_at
        +sendMessage()
    }

    class Message {
        +UUID id
        +UUID conversation_id
        +UUID sender_id
        +String content
        +Boolean is_read
    }

    class SearchAlert {
        +UUID id
        +UUID user_id
        +String name
        +String city
        +String property_type
        +Float min_price
        +Float max_price
        +Int min_bedrooms
        +Int max_bedrooms
        +Boolean is_active
        +create()
        +toggle()
        +checkMatches()
    }

    class AgencySubscription {
        +UUID id
        +UUID user_id
        +UUID package_id
        +String agency_name
        +String status
        +Date starts_at
        +Date expires_at
        +Boolean auto_renew
        +subscribe()
        +renew()
        +cancel()
    }

    class FeaturedListing {
        +UUID id
        +UUID property_id
        +Int duration_days
        +String feature_type
        +String status
        +Float price_paid
        +Date starts_at
        +Date expires_at
        +purchase()
        +activate()
    }

    class SecurityAuditLog {
        +UUID id
        +UUID user_id
        +String action_type
        +String resource_type
        +UUID resource_id
        +String ip_address
        +String user_agent
        +Boolean is_suspicious
        +Int risk_score
        +JSON location_data
        +log()
        +analyze()
    }

    class ThreatDetection {
        +UUID id
        +String threat_type
        +String severity
        +UUID user_id
        +String ip_address
        +JSON details
        +Boolean is_resolved
        +String action_taken
        +detect()
        +resolve()
    }

    class TwoFactorAuth {
        +UUID id
        +UUID user_id
        +String secret_key
        +Boolean is_enabled
        +String[] backup_codes
        +enable()
        +disable()
        +verify()
    }

    class EncryptedDataVault {
        +UUID id
        +UUID user_id
        +String data_type
        +String encrypted_data
        +String data_hash
        +Int encryption_version
        +store()
        +retrieve()
    }

    class DemandAnalytics {
        +UUID id
        +String city
        +String property_type
        +Date period_date
        +Int search_count
        +Int view_count
        +Int inquiry_count
        +Float avg_price
        +Float latitude
        +Float longitude
        +compute()
    }

    User "1" --> "0..*" Property : owns
    User "1" --> "0..*" Contract : as landlord
    User "1" --> "0..*" Contract : as tenant
    User "1" --> "0..1" KYCVerification : submits
    User "1" --> "0..1" Handyman : extends as
    User "1" --> "0..*" Conversation : participates
    User "1" --> "0..*" Notification : receives
    User "1" --> "0..*" SearchAlert : creates
    User "1" --> "0..1" AgencySubscription : subscribes
    User "1" --> "0..*" UserRole : has roles
    User "1" --> "0..*" Report : submits
    User "1" --> "0..*" SupportRequest : creates
    User "1" --> "0..*" PaymentHistory : records
    User "1" --> "0..1" TwoFactorAuth : configures
    User "1" --> "0..*" SecurityAuditLog : generates
    User "1" --> "0..*" EncryptedDataVault : stores

    Property "1" --> "0..*" Contract : subject of
    Property "1" --> "0..*" FeaturedListing : promoted by
    Property "1" --> "0..*" Report : reported

    Contract "1" --> "0..*" Bill : generates
    Contract "1" --> "0..*" Review : receives
    Contract "1" --> "0..*" Arrabon : secured by

    Handyman "1" --> "0..*" ServiceRequest : receives
    User "1" --> "0..*" ServiceRequest : as client

    Conversation "1" --> "0..*" Message : contains
```

---

## 3. Sequence Diagram - Property Rental Process

```mermaid
sequenceDiagram
    actor T as Tenant
    participant S as System
    actor O as Owner
    participant C as Contract
    participant W as Wallet
    actor A as Admin

    T->>S: searchProperties(filters)
    S-->>T: propertyList

    T->>S: bookViewing(propertyId)
    S->>O: notifyViewingRequest()
    O->>S: confirmViewing()
    S-->>T: viewingConfirmed

    T->>S: requestContract(propertyId)
    S->>C: createContract()
    C-->>S: contractCreated
    S->>O: notifyContractRequest()
    O->>C: signContract()

    alt KYC Required
        S->>T: requestKYC()
        T->>S: submitKYC(documents)
        S->>A: notifyKYCReview()
        A->>S: verifyKYC(approved)
        S-->>T: kycVerified
    end

    T->>C: signContract()
    Note over T,C: Both parties signed

    T->>W: payArrabon(amount)
    W-->>S: arrabonHeld
    S->>A: notifyPaymentVerification()
    A->>S: approvePayment()
    S->>W: releaseToOwner(amount)
    W-->>O: paymentReceived

    S-->>T: contractActive
    S-->>O: contractActive
```

---

## 4. Sequence Diagram - Handyman Service Request

```mermaid
sequenceDiagram
    actor C as Client
    participant S as System
    actor H as Handyman
    participant W as Wallet

    C->>S: searchHandymen(filters)
    S-->>C: handymanList

    C->>S: createServiceRequest(details)
    S->>H: notifyNewRequest()

    H->>S: acceptRequest(estimatedPrice)
    S-->>C: requestAccepted

    C->>W: holdEscrow(estimatedPrice)
    W-->>S: escrowHeld

    H->>S: startService()
    S-->>C: serviceStarted

    H->>S: completeService(finalPrice)
    S-->>C: serviceCompleted

    opt Client Satisfied
        C->>S: confirmCompletion()
        S->>W: releaseEscrow(handymanId, finalPrice)
        W-->>H: paymentReleased
    end

    opt Dispute
        C->>S: raiseDispute(reason)
        S->>S: holdEscrow()
        Note over S: Admin reviews dispute
    end

    C->>S: leaveReview(rating, comment)
    H->>S: leaveClientReview(rating, comment)
    S-->>C: reviewsRecorded
    S-->>H: reviewsRecorded
```

---

## 5. Sequence Diagram - Admin Dashboard Operations

```mermaid
sequenceDiagram
    actor A as Admin
    participant AD as AdminDashboard
    participant DB as Supabase DB
    participant N as Notification System
    actor U as User

    Note over A,U: Admin Login & Role Check
    A->>AD: accessDashboard()
    AD->>DB: checkAdminRole(user_id)
    DB-->>AD: hasRole(admin) = true

    Note over A,U: Platform Statistics
    AD->>DB: fetchPlatformStats()
    DB-->>AD: users, properties, contracts, revenue

    Note over A,U: User Management
    A->>AD: viewAllUsers()
    AD->>DB: SELECT * FROM profiles
    DB-->>AD: userList
    A->>AD: changeUserRole(userId, newRole)
    AD->>DB: UPDATE profiles SET role_type
    AD->>N: notifyUser(roleChanged)
    N-->>U: Your role has been updated

    Note over A,U: Report Management
    A->>AD: viewReports()
    AD->>DB: SELECT * FROM reports WHERE status=pending
    DB-->>AD: reportList
    A->>AD: resolveReport(reportId, action)
    alt Hide Property
        AD->>DB: UPDATE properties SET is_available=false
    end
    alt Warn User
        AD->>N: sendWarning(userId)
    end
    AD->>DB: UPDATE reports SET status=resolved

    Note over A,U: KYC Verification
    A->>AD: reviewKYC(userId)
    AD->>DB: admin_get_kyc_verification(userId)
    DB-->>AD: kycDocuments + signedUrls
    A->>AD: approveKYC(userId)
    AD->>DB: admin_verify_kyc(userId, verified)
    AD->>N: notifyUser(kycApproved)
    N-->>U: KYC Verified

    Note over A,U: Support Requests
    A->>AD: viewSupportRequests()
    AD->>DB: SELECT * FROM support_requests
    A->>AD: processRequest(requestId, approve)
    AD->>DB: UPDATE support_requests SET status
    AD->>DB: UPDATE profiles SET role_type (if role change)
    AD->>N: notifyUser(requestProcessed)
    N-->>U: Request processed

    Note over A,U: Contract Management
    A->>AD: viewAllContracts()
    AD->>DB: SELECT * FROM contracts
    A->>AD: activateContract(contractId)
    AD->>DB: UPDATE contracts SET status=active
    AD->>N: notifyParties(contractActivated)

    Note over A,U: Security Audit
    A->>AD: runSecurityScan()
    AD->>DB: SELECT * FROM security_audit_log
    AD->>DB: SELECT * FROM threat_detection
    DB-->>AD: securityFindings
```

---

## 6. Activity Diagram - User Registration and Property Rental

```mermaid
flowchart TD
    START((Start)) --> OPEN[Open Application]
    OPEN --> DECISION1{New or Existing User?}

    DECISION1 -->|New User| REGISTER[Register Account]
    DECISION1 -->|Existing User| LOGIN[Login]

    REGISTER --> SELECT_ROLE[Select Role: Tenant / Owner / Handyman]
    SELECT_ROLE --> FORK1

    FORK1 --> PROFILE[Complete Profile]
    FORK1 --> KYC[Submit KYC Documents]

    PROFILE --> JOIN1
    KYC --> KYC_REVIEW{KYC Decision}
    KYC_REVIEW -->|Approved| JOIN1
    KYC_REVIEW -->|Rejected| RESUBMIT[Resubmit Documents]
    RESUBMIT --> KYC

    LOGIN --> DASHBOARD
    JOIN1 --> DASHBOARD[View Dashboard]

    DASHBOARD --> ROLE_DECISION{User Role?}

    ROLE_DECISION -->|Tenant| SEARCH[Search Properties]
    ROLE_DECISION -->|Owner| ADD_PROP[Add Property Details]
    ROLE_DECISION -->|Handyman| WAIT_REQ[Wait for Service Requests]
    ROLE_DECISION -->|Admin| ADMIN_DASH[Admin Dashboard]

    SEARCH --> VIEW_DETAIL[View Property Details]
    VIEW_DETAIL --> INTEREST{Interested?}
    INTEREST -->|No| SEARCH
    INTEREST -->|Yes| BOOK_VIEW[Book Viewing]
    BOOK_VIEW --> VIEWING_DONE{Proceed?}
    VIEWING_DONE -->|No| SEARCH
    VIEWING_DONE -->|Yes| REQUEST_CONTRACT[Request Contract]
    REQUEST_CONTRACT --> SIGN[Sign Contract]
    SIGN --> PAY_ARRABON[Pay Arrabon]
    PAY_ARRABON --> ADMIN_VERIFY{Payment Verified?}
    ADMIN_VERIFY -->|Yes| CONTRACT_ACTIVE[Contract Active]
    ADMIN_VERIFY -->|No| PAY_ARRABON
    CONTRACT_ACTIVE --> END_NODE((End))

    ADD_PROP --> UPLOAD_IMG[Upload Images]
    UPLOAD_IMG --> PUBLISH[Publish Listing]
    PUBLISH --> FEATURE_DECISION{Feature Listing?}
    FEATURE_DECISION -->|Yes| PAY_FEATURE[Pay for Featured]
    FEATURE_DECISION -->|No| WAIT_TENANT[Wait for Tenant]
    PAY_FEATURE --> WAIT_TENANT
    WAIT_TENANT --> END_NODE

    WAIT_REQ --> ACCEPT_REQ{Accept Request?}
    ACCEPT_REQ -->|Yes| START_SERVICE[Start Service]
    ACCEPT_REQ -->|No| WAIT_REQ
    START_SERVICE --> COMPLETE_SERVICE[Complete Service]
    COMPLETE_SERVICE --> RECEIVE_PAYMENT[Receive Payment]
    RECEIVE_PAYMENT --> LEAVE_REVIEW[Leave Review]
    LEAVE_REVIEW --> END_NODE

    ADMIN_DASH --> ADMIN_OPS{Admin Operation?}
    ADMIN_OPS -->|Verify KYC| REVIEW_KYC[Review KYC Documents]
    ADMIN_OPS -->|Manage Users| MANAGE_USERS[Change Roles / Ban]
    ADMIN_OPS -->|Handle Reports| HANDLE_REPORTS[Review & Resolve Reports]
    ADMIN_OPS -->|Manage Contracts| MANAGE_CONTRACTS[Activate/Cancel Contracts]
    ADMIN_OPS -->|Process Payments| PROCESS_PAY[Approve/Reject Payments]
    ADMIN_OPS -->|Support Requests| PROCESS_SUPPORT[Process Role Changes]
    REVIEW_KYC --> END_NODE
    MANAGE_USERS --> END_NODE
    HANDLE_REPORTS --> END_NODE
    MANAGE_CONTRACTS --> END_NODE
    PROCESS_PAY --> END_NODE
    PROCESS_SUPPORT --> END_NODE
```

---

## 7. Activity Diagram - KYC Verification Process (Admin)

```mermaid
flowchart TD
    START((Start)) --> RECEIVE[Receive KYC Submission]
    RECEIVE --> CHECK_DOCS[Check ID Documents]
    CHECK_DOCS --> VALID_DOCS{Documents Valid?}

    VALID_DOCS -->|No| REQUEST_RESUBMIT[Request Resubmission]
    REQUEST_RESUBMIT --> NOTIFY_USER[Notify User]
    NOTIFY_USER --> END_REJECT((End - Rejected))

    VALID_DOCS -->|Yes| VERIFY_SELFIE[Verify Selfie Match]
    VERIFY_SELFIE --> SELFIE_MATCH{Selfie Matches ID?}

    SELFIE_MATCH -->|No| REQUEST_RESUBMIT

    SELFIE_MATCH -->|Yes| APPROVE[Approve KYC]
    APPROVE --> UPDATE_PROFILE[Update User Profile]
    UPDATE_PROFILE --> LOG_AUDIT[Log Audit Trail]
    LOG_AUDIT --> NOTIFY_APPROVED[Notify User - Approved]
    NOTIFY_APPROVED --> END_OK((End - Verified))
```

---

## 8. Activity Diagram - Admin Report Management

```mermaid
flowchart TD
    START((Start)) --> RECEIVE_REPORT[Receive Report / Flag]
    RECEIVE_REPORT --> CHECK_TYPE{Report Type?}

    CHECK_TYPE -->|Property| REVIEW_PROP[Review Property Details]
    CHECK_TYPE -->|Handyman| REVIEW_HANDY[Review Handyman Profile]
    CHECK_TYPE -->|User| REVIEW_USER[Review User Activity]

    REVIEW_PROP --> PROP_ACTION{Take Action?}
    PROP_ACTION -->|Hide Property| HIDE[Set is_available = false]
    PROP_ACTION -->|Delete Property| DELETE_PROP[Delete Property]
    PROP_ACTION -->|Dismiss| DISMISS1[Mark as Dismissed]

    REVIEW_HANDY --> HANDY_ACTION{Take Action?}
    HANDY_ACTION -->|Suspend| SUSPEND_H[Set is_available = false]
    HANDY_ACTION -->|Warn| WARN_H[Send Warning Notification]
    HANDY_ACTION -->|Dismiss| DISMISS2[Mark as Dismissed]

    REVIEW_USER --> USER_ACTION{Take Action?}
    USER_ACTION -->|Change Role| ROLE_CHANGE[Update Role]
    USER_ACTION -->|Warn| WARN_U[Send Warning]
    USER_ACTION -->|Dismiss| DISMISS3[Mark as Dismissed]

    HIDE --> RESOLVE[Mark Report Resolved]
    DELETE_PROP --> RESOLVE
    DISMISS1 --> RESOLVE
    SUSPEND_H --> RESOLVE
    WARN_H --> RESOLVE
    DISMISS2 --> RESOLVE
    ROLE_CHANGE --> RESOLVE
    WARN_U --> RESOLVE
    DISMISS3 --> RESOLVE

    RESOLVE --> NOTIFY[Notify Reporter]
    NOTIFY --> LOG[Log in Audit Trail]
    LOG --> END_NODE((End))
```

---

## 9. State Diagram - Contract Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft : createContract()
    
    Draft --> PendingSignatures : submitForSigning()
    Draft --> Cancelled : cancel()
    
    PendingSignatures --> LandlordSigned : landlord signs
    PendingSignatures --> TenantSigned : tenant signs
    PendingSignatures --> Cancelled : cancel()
    
    LandlordSigned --> FullySigned : tenant signs
    TenantSigned --> FullySigned : landlord signs
    
    FullySigned --> PendingPayment : requireArrabon()
    FullySigned --> Active : noArrabonRequired()
    
    PendingPayment --> PendingVerification : tenantPaysArrabon()
    PendingVerification --> Active : adminApprovesPayment()
    PendingVerification --> PendingPayment : adminRejectsPayment()
    
    Active --> Completed : endDateReached()
    Active --> Terminated : earlyTermination()
    Active --> Disputed : raiseDispute()
    
    Disputed --> Active : disputeResolved()
    Disputed --> Terminated : adminTerminates()
    
    Completed --> [*]
    Terminated --> [*]
    Cancelled --> [*]
```

---

## 10. State Diagram - Service Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending : createRequest()
    
    Pending --> Accepted : handymanAccepts()
    Pending --> Cancelled : clientCancels()
    Pending --> Rejected : handymanRejects()
    
    Accepted --> EscrowHeld : clientPaysEscrow()
    
    EscrowHeld --> InProgress : handymanStarts()
    EscrowHeld --> Cancelled : clientCancels()
    
    InProgress --> Completed : handymanCompletes()
    
    Completed --> PaymentReleased : clientConfirms()
    Completed --> Disputed : clientDisputes()
    
    PaymentReleased --> Reviewed : bothPartiesReview()
    
    Disputed --> PaymentReleased : adminResolvesForHandyman()
    Disputed --> Refunded : adminResolvesForClient()
    
    Reviewed --> [*]
    Refunded --> [*]
    Cancelled --> [*]
    Rejected --> [*]
```

---

## 11. Deployment Diagram

```mermaid
graph TB
    subgraph "Client Devices"
        MOBILE["Mobile App (Capacitor iOS/Android)"]
        BROWSER["Web Browser (Chrome/Firefox/Safari)"]
        PWA["Installed PWA"]
    end

    subgraph "CDN / Hosting"
        LOVABLE["Lovable Cloud CDN"]
    end

    subgraph "Supabase Cloud"
        AUTH["Auth Service (JWT + GoTrue)"]
        POSTGRES["PostgreSQL 15 (+ RLS)"]
        STORAGE["Storage (S3-compatible)"]
        REALTIME["Realtime Engine (WebSocket)"]
        EDGE["Edge Functions (Deno Runtime)"]
    end

    subgraph "Edge Functions Detail"
        FN_CHAT["chat/ - AI Assistant"]
        FN_SEARCH["ai-search/ - Smart Search"]
        FN_ALERTS["check-alerts/ - Alert Matching"]
        FN_EXPIRY["check-expiry/ - Expiry Notifications"]
        FN_PUSH["send-push/ - Web Push"]
        FN_TTS["text-to-speech/ - TTS"]
        FN_SATIM1["satim-create-payment/"]
        FN_SATIM2["satim-check-status/"]
        FN_SATIM3["satim-payment-callback/"]
        FN_AI_REC["ai-recommendations/"]
    end

    subgraph "External Services"
        AI_GW["Lovable AI Gateway (Gemini 2.5 Flash)"]
        OSM["OpenStreetMap Tiles"]
        PUSH_SVC["Web Push Service (VAPID)"]
    end

    MOBILE --> LOVABLE
    BROWSER --> LOVABLE
    PWA --> LOVABLE
    LOVABLE --> AUTH
    LOVABLE --> POSTGRES
    LOVABLE --> STORAGE
    LOVABLE --> REALTIME
    LOVABLE --> EDGE

    EDGE --> FN_CHAT
    EDGE --> FN_SEARCH
    EDGE --> FN_ALERTS
    EDGE --> FN_EXPIRY
    EDGE --> FN_PUSH
    EDGE --> FN_TTS
    EDGE --> FN_SATIM1
    EDGE --> FN_SATIM2
    EDGE --> FN_SATIM3
    EDGE --> FN_AI_REC

    FN_CHAT --> AI_GW
    FN_SEARCH --> AI_GW
    FN_AI_REC --> AI_GW
    FN_PUSH --> PUSH_SVC
    BROWSER --> OSM
```

---

## 12. Component Diagram

```mermaid
graph TB
    subgraph "App.tsx - Root Component"
        subgraph "Providers"
            QC["QueryClientProvider"]
            AP["AuthProvider"]
            LP["LanguageProvider"]
            TP["TooltipProvider"]
        end

        subgraph "Pages (22+)"
            P_AUTH["AuthPage"]
            P_INDEX["Index (Home)"]
            P_PROPS["PropertiesPage"]
            P_DETAIL["PropertyDetailPage"]
            P_ADD["AddPropertyPage"]
            P_CHAT["ChatPage"]
            P_CONTRACTS["ContractsPage"]
            P_CREATE_C["CreateContractPage"]
            P_WALLET["WalletPage"]
            P_ADMIN["AdminDashboard"]
            P_OWNER["OwnerDashboard"]
            P_HANDY["HandymanDashboard"]
            P_AGENCY["AgencyDashboard"]
            P_PROFILE["ProfilePage"]
            P_SETTINGS["SettingsPage"]
            P_FAVS["FavoritesPage"]
            P_ALERTS["AlertsPage"]
            P_BILLS["BillsPage"]
            P_APPT["AppointmentsPage"]
            P_ARRABON["ArrabonPage"]
            P_HANDYMEN["HandymenPage"]
            P_SERVICE["ServiceRequestsPage"]
        end

        subgraph "Admin Components (7)"
            AC_STATS["PlatformStats"]
            AC_USERS["UserManagement"]
            AC_CONTRACTS["ContractsManagement"]
            AC_REPORTS["ReportsManagement"]
            AC_PAYMENTS["PaymentManagement"]
            AC_SUPPORT["SupportRequestsManagement"]
            AC_HEATMAP["DemandHeatmap"]
        end

        subgraph "Feature Components (50+)"
            FC_AI["AIVoiceHub"]
            FC_PCARD["PropertyCard"]
            FC_MAP["LeafletMap / InteractiveMap"]
            FC_KYC["KYCFlow"]
            FC_NAV["MobileBottomNav"]
            FC_NOTIF["NotificationCenter"]
            FC_REVIEW["ReviewsList / StarRating"]
            FC_UPLOAD["MultiImageUpload"]
            FC_REPORT["ReportDialog"]
            FC_CONFIRM["ConfirmDialog"]
            FC_SIG["SignaturePad / SignatureDisplay"]
            FC_PWA["InstallPrompt / OfflineIndicator"]
            FC_PREMIUM["FeaturedBadge / AgencyBadge"]
        end

        subgraph "Custom Hooks (15+)"
            H_AUTH["useAuth"]
            H_ADMIN["useAdminRole"]
            H_CHAT["useChat"]
            H_FAV["useFavorites"]
            H_GEO["useGeolocation"]
            H_KYC["useKycDocuments"]
            H_NATIVE["useNativeFeatures"]
            H_PUSH["usePushNotifications"]
            H_VOICE["useVoiceChat / useVoiceRecognition"]
            H_VIEWS["usePropertyViews"]
            H_THEME["useTheme"]
            H_MOBILE["use-mobile"]
        end

        subgraph "Supabase Integration"
            SB_CLIENT["client.ts"]
            SB_TYPES["types.ts (auto-generated)"]
        end
    end

    P_ADMIN --> AC_STATS
    P_ADMIN --> AC_USERS
    P_ADMIN --> AC_CONTRACTS
    P_ADMIN --> AC_REPORTS
    P_ADMIN --> AC_PAYMENTS
    P_ADMIN --> AC_SUPPORT
    P_ADMIN --> AC_HEATMAP
```

---

## How to Export as Images

1. **Mermaid Live Editor**: Go to https://mermaid.live, paste each diagram code, and export as PNG/SVG
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **CLI**: Use `mmdc` (Mermaid CLI): `npx @mermaid-js/mermaid-cli mmdc -i input.md -o output.png`
