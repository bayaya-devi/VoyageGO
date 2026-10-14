-- VoyageGo worldwide platform domain schema.
-- Better Auth remains the source of truth for identities, accounts, sessions and OTP records.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "profile" (
  "userId" TEXT PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "locale" TEXT NOT NULL DEFAULT 'fr' CHECK ("locale" IN ('fr','ar','en','es','pt')),
  "currency" TEXT NOT NULL DEFAULT 'EUR' CHECK (length("currency") = 3),
  "favoriteCountries" TEXT NOT NULL DEFAULT '[]',
  "interests" TEXT NOT NULL DEFAULT '[]',
  "travelStyle" TEXT,
  "budgetBand" TEXT,
  "accommodationPreferences" TEXT NOT NULL DEFAULT '[]',
  "onboardingStep" INTEGER NOT NULL DEFAULT 0 CHECK ("onboardingStep" BETWEEN 0 AND 8),
  "onboardingCompletedAt" INTEGER,
  "tutorialCompletedAt" INTEGER,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "destination" (
  "iso2" TEXT PRIMARY KEY NOT NULL CHECK (length("iso2") = 2),
  "iso3" TEXT NOT NULL UNIQUE CHECK (length("iso3") = 3),
  "names" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '{}',
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "contentStatus" TEXT NOT NULL DEFAULT 'preparing' CHECK ("contentStatus" IN ('preparing','published')),
  "serviceStatus" TEXT NOT NULL DEFAULT 'inactive' CHECK ("serviceStatus" IN ('inactive','request_enabled')),
  "capabilities" TEXT NOT NULL DEFAULT '{}',
  "accent" TEXT,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "trip" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "destinationIso2" TEXT REFERENCES "destination"("iso2") ON DELETE SET NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'guided' CHECK ("mode" IN ('guided','free')),
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','active','past','archived')),
  "visibility" TEXT NOT NULL DEFAULT 'private' CHECK ("visibility" IN ('private','link')),
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "notes" TEXT NOT NULL DEFAULT '',
  "budgetAmount" INTEGER,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "trip_user_updated_idx" ON "trip"("userId", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "tripItem" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "tripId" TEXT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
  "dayIndex" INTEGER NOT NULL DEFAULT 0 CHECK ("dayIndex" >= 0),
  "position" INTEGER NOT NULL DEFAULT 0 CHECK ("position" >= 0),
  "type" TEXT NOT NULL CHECK ("type" IN ('place','note','booking','transport','activity')),
  "title" TEXT NOT NULL,
  "startsAt" TEXT,
  "address" TEXT,
  "latitude" REAL,
  "longitude" REAL,
  "notes" TEXT NOT NULL DEFAULT '',
  "sourceRef" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "trip_item_order_idx" ON "tripItem"("tripId", "dayIndex", "position");

CREATE TABLE IF NOT EXISTS "providerProfile" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "activityType" TEXT NOT NULL CHECK ("activityType" IN ('private_lodging','hotel','guide','activity','transport','vehicle_rental','other')),
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending_verification','active','suspended','rejected')),
  "countryCode" TEXT NOT NULL CHECK (length("countryCode") = 2),
  "publicName" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "rejectionReason" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "listing" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "providerId" TEXT NOT NULL REFERENCES "providerProfile"("id") ON DELETE CASCADE,
  "destinationIso2" TEXT NOT NULL REFERENCES "destination"("iso2"),
  "type" TEXT NOT NULL CHECK ("type" IN ('lodging','hotel','guide','activity','transport','vehicle_rental','other')),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "capacity" INTEGER CHECK ("capacity" IS NULL OR "capacity" > 0),
  "priceAmount" INTEGER CHECK ("priceAmount" IS NULL OR "priceAmount" >= 0),
  "currency" TEXT CHECK ("currency" IS NULL OR length("currency") = 3),
  "conditions" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending_review','active','suspended','archived')),
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "listing_provider_idx" ON "listing"("providerId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "listing_public_idx" ON "listing"("destinationIso2", "type", "status");

CREATE TABLE IF NOT EXISTS "availability" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "listingId" TEXT NOT NULL REFERENCES "listing"("id") ON DELETE CASCADE,
  "startsAt" TEXT NOT NULL,
  "endsAt" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1 CHECK ("capacity" > 0),
  "status" TEXT NOT NULL DEFAULT 'available' CHECK ("status" IN ('available','blocked')),
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  CHECK ("endsAt" > "startsAt")
);
CREATE INDEX IF NOT EXISTS "availability_listing_time_idx" ON "availability"("listingId", "startsAt", "endsAt");

CREATE TABLE IF NOT EXISTS "bookingRequest" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "listingId" TEXT NOT NULL REFERENCES "listing"("id"),
  "availabilityId" TEXT REFERENCES "availability"("id"),
  "travelerId" TEXT NOT NULL REFERENCES "user"("id"),
  "providerId" TEXT NOT NULL REFERENCES "providerProfile"("id"),
  "startsAt" TEXT NOT NULL,
  "endsAt" TEXT NOT NULL,
  "travelerCount" INTEGER NOT NULL DEFAULT 1 CHECK ("travelerCount" > 0),
  "message" TEXT NOT NULL DEFAULT '',
  "quotedAmount" INTEGER,
  "currency" TEXT,
  "termsSnapshot" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','accepted','rejected','cancelled','expired','completed')),
  "paymentStatus" TEXT NOT NULL DEFAULT 'not_configured' CHECK ("paymentStatus" IN ('not_configured','unpaid','paid','refunded')),
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  UNIQUE ("travelerId", "idempotencyKey"),
  CHECK ("endsAt" > "startsAt")
);
CREATE INDEX IF NOT EXISTS "booking_traveler_idx" ON "bookingRequest"("travelerId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "booking_provider_idx" ON "bookingRequest"("providerId", "status", "updatedAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "booking_accepted_slot_idx" ON "bookingRequest"("availabilityId") WHERE "availabilityId" IS NOT NULL AND "status" = 'accepted';

CREATE TABLE IF NOT EXISTS "bookingEvent" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "bookingId" TEXT NOT NULL REFERENCES "bookingRequest"("id") ON DELETE CASCADE,
  "actorUserId" TEXT NOT NULL REFERENCES "user"("id"),
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  UNIQUE ("bookingId", "toStatus")
);

CREATE TABLE IF NOT EXISTS "notification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL CHECK ("category" IN ('trip','important','booking','suggestion','tourism')),
  "titleKey" TEXT NOT NULL,
  "payload" TEXT NOT NULL DEFAULT '{}',
  "readAt" INTEGER,
  "dedupKey" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  UNIQUE ("userId", "dedupKey")
);
CREATE INDEX IF NOT EXISTS "notification_user_idx" ON "notification"("userId", "readAt", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "favorite" (
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "resourceType" TEXT NOT NULL CHECK ("resourceType" IN ('destination','listing','place')),
  "resourceId" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  PRIMARY KEY ("userId", "resourceType", "resourceId")
);

-- Proposed launch content only. Commercial services remain disabled until explicit validation.
INSERT OR IGNORE INTO "destination" ("iso2","iso3","names","summary","latitude","longitude","contentStatus","serviceStatus","capabilities","accent","updatedAt") VALUES
('MA','MAR','{"fr":"Maroc","ar":"المغرب","en":"Morocco","es":"Marruecos","pt":"Marrocos"}','{"fr":"Médinas, Atlantique, Atlas et Sahara.","ar":"المدن العتيقة والأطلسي والأطلس والصحراء.","en":"Medinas, Atlantic shores, Atlas and Sahara.","es":"Medinas, Atlántico, Atlas y Sáhara.","pt":"Medinas, Atlântico, Atlas e Saara."}',31.8,-6.0,'published','inactive','{"information":true,"guides":true,"places":true,"providers":false,"bookingRequests":false,"partnerOffers":false}','#F3BD72',unixepoch()),
('FR','FRA','{"fr":"France","ar":"فرنسا","en":"France","es":"Francia","pt":"França"}','{"fr":"Villes, littoraux, Alpes et patrimoines.","ar":"مدن وسواحل وجبال الألب وتراث.","en":"Cities, coastlines, Alps and heritage.","es":"Ciudades, costas, Alpes y patrimonio.","pt":"Cidades, costas, Alpes e património."}',46.5,2.4,'published','inactive','{"information":true,"guides":false,"places":true,"providers":false,"bookingRequests":false,"partnerOffers":false}','#86C5D8',unixepoch()),
('TH','THA','{"fr":"Thaïlande","ar":"تايلاند","en":"Thailand","es":"Tailandia","pt":"Tailândia"}','{"fr":"Jungles, îles, villes et cuisines régionales.","ar":"غابات وجزر ومدن ومطابخ إقليمية.","en":"Jungles, islands, cities and regional cuisines.","es":"Selvas, islas, ciudades y cocinas regionales.","pt":"Selvas, ilhas, cidades e cozinhas regionais."}',15.8,100.9,'published','inactive','{"information":true,"guides":false,"places":true,"providers":false,"bookingRequests":false,"partnerOffers":false}','#2F7768',unixepoch());
