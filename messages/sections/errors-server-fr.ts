export const errorsServerFr = {
  "auth.invalidResetToken": "Lien de réinitialisation invalide ou expiré.",
  "auth.passwordUpdated": "Mot de passe mis à jour. Vous pouvez vous connecter.",
  "auth.passwordResetEmailSent":
    "Si un compte existe pour cet e-mail, nous avons envoyé les instructions.",
  "auth.profileNoFields": "Indiquez au moins un champ à modifier.",
  "auth.profileNoPassword":
    "Ce compte n'a pas de mot de passe. Utilisez la procédure « mot de passe oublié ».",
  "auth.profileCurrentPasswordRequired":
    "Le mot de passe actuel est requis pour en définir un nouveau.",
  "auth.profileCurrentPasswordIncorrect": "Mot de passe actuel incorrect.",
  "auth.profileDuplicateIdentity":
    "Un utilisateur avec cet e-mail, identifiant ou téléphone existe déjà",
  "auth.invalidCredentials": "Identifiants invalides.",
  "auth.roleNotProvisioned":
    "Le rôle « {type} » n'est pas configuré. Exécutez npm run seed:permissions.",

  "users.riderRequiresOwner": "Les conducteurs doivent être rattachés à un propriétaire (ownerId)",
  "users.ownerNotFound": "Propriétaire introuvable (id {ownerId})",
  "users.cannotDeactivateSelf": "Vous ne pouvez pas désactiver votre propre compte",
  "users.duplicateIdentity":
    "Un utilisateur avec cet e-mail, identifiant, téléphone ou NID existe déjà",
  "users.userNotFound": "Utilisateur introuvable (id {userId})",
  "users.swapperStationOnly": "Seuls les comptes échangeur peuvent être affectés à une station",
  "users.stationNotFound": "Station introuvable (id {stationId})",
  "users.inactiveAccount":
    "Le compte utilisateur est désactivé et ne peut pas être affecté (id {userId})",
  "users.reactivationRequiresPassword":
    "Définissez un nouveau mot de passe pour réactiver un compte désactivé",
  "users.inactiveCannotAssignOnCreate":
    "Impossible de créer un compte inactif avec une affectation station ou propriétaire de flotte",
  "users.inactiveMustReactivateFirst":
    "Réactivez le compte (autoriser la connexion) avant de modifier le profil ou les affectations",

  "erasure.alreadyErased": "Ce compte a déjà été effacé",
  "erasure.requestNotFound": "Demande d'effacement introuvable",
  "erasure.requestNotConfirmable": "Cette demande d'effacement ne peut pas être confirmée",
  "erasure.staffRequiresApproval": "Les comptes staff doivent attendre l'approbation d'un administrateur",
  "erasure.confirmPasswordRequired": "Le mot de passe est requis pour confirmer l'effacement",
  "erasure.confirmPasswordIncorrect": "Mot de passe incorrect",
  "erasure.openSwapInProgress": "Terminez ou annulez les échanges en cours avant d'effacer le compte",
  "erasure.walletBalanceRemaining": "Le solde doit être nul ou vous devez accepter la perte du solde",
  "erasure.forfeitureRequired": "Acceptez la perte du solde pour continuer",
  "erasure.cannotApproveOwnErasure": "Vous ne pouvez pas approuver votre propre demande",
  "erasure.adminFourEyesRequired": "L'effacement d'un administrateur requiert un autre administrateur",
  "erasure.activeRequestExists": "Une demande d'effacement est déjà en cours",
  "erasure.cannotDeactivateSelf": "Vous ne pouvez pas désactiver votre propre compte de cette façon",

  "owners.userNotFound": "Utilisateur introuvable (id {userId})",
  "owners.portalUserMustBeOwner": "Le compte portail doit être de type propriétaire",
  "owners.portalUserMustNotHaveOwnerId": "Les comptes propriétaire portail ne doivent pas avoir ownerId",
  "owners.duplicatePortalUser": "Un propriétaire avec ce compte portail existe déjà",
  "owners.duplicateIdentity": "Un propriétaire avec cette identité existe déjà",

  "wallets.ownerNotFound": "Propriétaire introuvable (id {ownerId})",
  "wallets.walletExists": "Un portefeuille existe déjà pour ce propriétaire",

  "bikes.assignOwnerBeforeRider": "Affectez un propriétaire de flotte avant d'attribuer un conducteur",
  "bikes.ownerNotFound": "Propriétaire introuvable (id {ownerId})",
  "bikes.warehouseNoBatteryOnCreate":
    "Les motos en entrepôt ne peuvent pas être créées avec une batterie installée",
  "bikes.warehouseNoBattery": "Les motos en entrepôt ne peuvent pas avoir de batterie installée",
  "bikes.duplicateIdentity": "Une moto avec cette immatriculation ou ce numéro de série existe déjà",
  "bikes.riderRequiresBattery":
    "Une batterie doit être installée sur la moto avant d'y affecter un conducteur",
  "bikes.batteryViaSwapOnly":
    "Installez ou retirez les batteries sur les motos uniquement via une opération d'échange",

  "batteries.serialQueryRequired": "Le paramètre serialNumber est requis",
  "batteries.duplicateSerial": "Une batterie avec ce numéro de série existe déjà",
  "batteries.bikeAndStation":
    "Une batterie ne peut pas être sur une moto et une station en même temps",
  "batteries.bikeHasDifferentBattery":
    "Cette moto a déjà une autre batterie. Retirez-la avant d'assigner ce pack.",
  "batteries.warehouseBikeInstall":
    "Impossible d'installer une batterie sur une moto encore en stock entrepôt. Sortez-la d'abord vers une flotte.",
  "batteries.stationRequiresInventory":
    "Affectez une batterie à une station uniquement lorsqu'elle est en stock entrepôt",
  "batteries.bikeViaSwapOnly":
    "Déplacez les batteries entre stations et motos uniquement via une opération d'échange",
  "batteries.offlineCannotAssign":
    "Les batteries hors ligne ou défectueuses ne peuvent pas être affectées à une station ou une moto. Changez d'abord le statut.",
  "batteries.chargingRequiresStation": "Le statut « en charge » exige une affectation à une station.",
  "batteries.inUseRequiresBike": "Le statut « en utilisation » exige une affectation à une moto.",

  "stations.uniqueCodeFailed": "Impossible d'attribuer un code station unique ; réessayez",
  "stations.duplicateCode": "Une station avec ce code existe déjà",
  "stations.invalidUpdate": "La station n'a pas pu être mise à jour.",

  "swaps.incomingSerialRequired": "Le numéro de série de la batterie entrante est requis",
  "swaps.incomingSerialMismatch":
    "Ce numéro ne correspond pas à la batterie actuellement sur la moto sélectionnée",
  "swaps.incomingSerialRequiredWhenMounted":
    "incomingBatterySerialNumber est requis lorsque la moto a une batterie montée",
  "swaps.userNotOnBike": "L'utilisateur sélectionné n'est pas affecté à cette moto",
  "swaps.bikeNoFleetOwner": "Cette moto n'est pas affectée à un propriétaire de flotte",
  "swaps.riderNoCard": "Le conducteur n'a pas de carte NFC active pour cet échange",
  "swaps.noBatteryAtStation": "Aucune batterie disponible à la station sélectionnée",
  "swaps.ownerWalletMissing": "Portefeuille propriétaire introuvable pour le paiement",
  "swaps.sameBatteryReturnIssue": "Un échange ne peut pas rendre et émettre la même batterie",
  "swaps.batteryOnAnotherBike": "La batterie émise est déjà montée sur une autre moto",
  "swaps.invalidSwapOrPaymentStatus": "Statut d'échange ou de paiement invalide",
  "swaps.createFailed": "Impossible de créer la transaction d'échange",
  "swaps.invalidSwapStatus": "Statut d'échange invalide",
  "swaps.invalidPaymentStatus": "Statut de paiement invalide",
  "swaps.updateFailed": "Impossible de mettre à jour la transaction d'échange",
  "swaps.operatorRequired": "Un opérateur d'échange valide est requis",
  "swaps.riderUserRequired": "Un compte conducteur est requis",
  "swaps.swapperRequired": "Un compte échangeur est requis",
  "swaps.operatorInactive": "Le compte opérateur d'échange n'est pas actif",
  "swaps.operatorNotAllowed": "Cet utilisateur n'est pas autorisé à opérer les échanges",
  "swaps.riderAccountRequired": "L'utilisateur n'est pas un compte conducteur",
  "swaps.riderInactive": "Le compte conducteur n'est pas actif",
  "swaps.riderNoFleetOwnerShort": "Le conducteur n'est pas rattaché à une flotte",
  "swaps.ownerUserNotLinked": "Le compte propriétaire n'est pas lié à un enregistrement Owner",
  "swaps.cannotOperateSwap": "Cet utilisateur ne peut pas opérer d'échanges pour ce compte",
  "swaps.accountInactive": "Le compte utilisateur n'est pas actif",

  "uploads.photoRequired": "Un fichier photo est requis",
  "uploads.photoTooLarge": "La photo doit faire 5 Mo ou moins",
  "uploads.photoInvalidType": "La photo doit être JPEG, PNG, WebP ou GIF",

  "incidents.alreadyClosed": "Cet incident est déjà clos",
  "incidents.batteryNotFound": "Batterie introuvable (id {batteryId})",
  "incidents.batteryWrongStation": "La batterie n'est pas à votre station assignée",
  "incidents.batteryAlreadyFaulty": "La batterie est déjà marquée défectueuse",
  "incidents.openIncidentExists": "Un incident ouvert existe déjà pour cette batterie",
  "incidents.swapNotFound": "Transaction d'échange introuvable (id {swapId})",
  "incidents.swapWrongStation": "La transaction n'est pas à votre station",
  "incidents.trackIdFailed": "Impossible d'allouer un ID incident ; réessayez",
  "incidents.batteryMissing": "Batterie introuvable",
  "incidents.invalidAction": "Cette action n'est pas autorisée pour l'incident",
  "incidents.cannotPostMessage": "Vous ne pouvez pas publier de message sur cet incident dans son état actuel",
  "incidents.batteryLeftStation":
    "La batterie n'est plus à la station signalée ; impossible de marquer endommagée",
  "incidents.batteryMountedOnBike":
    "La batterie est sur une moto ; terminez l'échange avant de marquer endommagée",

  "inventory.warehouseBikeNoBattery": "Les motos en entrepôt ne peuvent pas avoir de batterie installée",
  "inventory.bikeReturnRequiresStation":
    "Retournez une moto à l'entrepôt seulement après enregistrement en station (sans conducteur ni batterie)",
  "inventory.duplicateBike": "Une moto avec cette immatriculation, ce châssis ou ce numéro de série existe déjà",
  "inventory.duplicateBattery": "Une batterie avec ce numéro de série existe déjà",
  "inventory.notBike": "Cet enregistrement d'inventaire n'est pas une moto",
  "inventory.ownerNotFound": "Propriétaire introuvable (id {ownerId})",
  "inventory.notBattery": "Cet enregistrement d'inventaire n'est pas une batterie",
  "inventory.stationNotFound": "Station introuvable (id {stationId})",

  "companyAccounts.duplicateAccount": "Un compte société avec ce numéro existe déjà",

  "violations.entityNotFound": "{label} introuvable (id {id})",
  "violations.stationNotFound": "Station introuvable (id {id})",
  "violations.duplicateTrackId": "Une infraction avec cet ID de suivi existe déjà",

  "ledger.lineSingleAccount": "Chaque ligne doit référencer exactement un compte",
  "ledger.exactlyTwoLines": "Les écritures nécessitent exactement deux lignes",
  "ledger.positiveAmount": "Le montant de la ligne doit être positif",
  "ledger.debitCreditMatch": "Les montants débit et crédit doivent correspondre",
  "ledger.oneDebitOneCredit": "Il faut une ligne débit et une ligne crédit",
  "ledger.insufficientCompanyBalance": "Solde du compte société insuffisant",
  "ledger.insufficientWalletBalance": "Solde portefeuille insuffisant",
  "ledger.floatTopUpAccounts": "Le rechargement flottant doit débiter le compte société et créditer le portefeuille",
  "ledger.floatTopUpReferenceRequired": "externalReference est requis pour le rechargement flottant",
  "ledger.companyFloatCreditReferenceRequired":
    "La référence de virement est requise pour créditer le flottant",
  "ledger.companyFloatSourceAccountMissing":
    "Le compte source de flottant société n'est pas configuré. Exécutez seed:ledger-accounts.",
  "ledger.currencyMismatchCompanyRevenue":
    "Les devises du compte société et de la source de flottant doivent correspondre",
  "ledger.agentTopUpInvalid": "Écritures de rechargement agent invalides",
  "ledger.agentTopUpWalletPair":
    "Le rechargement agent doit débiter le portefeuille agent et créditer un autre portefeuille",
  "ledger.revenueAccountMissing":
    "Le compte revenus « {code} » n'est pas configuré. Exécutez seed:ledger-accounts.",
  "ledger.agentTopUpReferenceRequired": "externalReference est requis pour le rechargement agent",
  "ledger.swapFeeAccounts": "Les frais d'échange doivent débiter le portefeuille et créditer le compte revenus",
  "ledger.currencyMismatchWalletCompany": "Les devises portefeuille et compte société doivent correspondre",
  "ledger.topUpPositive": "Le montant du rechargement doit être positif",
  "ledger.sourceNotAgentFloat": "Le portefeuille source n'est pas un flottant agent",
  "ledger.agentFloatWrongUser": "Le flottant agent n'appartient pas à l'utilisateur actif",
  "ledger.topUpTargetRiderOrOwner": "La cible doit être un portefeuille conducteur ou propriétaire",
  "ledger.agentTargetCurrencyMismatch": "Les devises flottant et cible doivent correspondre",
  "ledger.transferInvalid": "Transfert entre portefeuilles invalide",
  "ledger.swapFeePositive": "Le montant des frais d'échange doit être positif",
  "ledger.currencyMismatchWalletRevenue": "Les devises portefeuille et revenus doivent correspondre",

  "agents.duplicateAgent": "Un agent avec ce compte portail ou portefeuille existe déjà",
  "agents.duplicatePortalUser": "Un agent avec ce compte portail existe déjà",
  "agents.searchTooShort": "Saisissez au moins 2 caractères",
  "agents.multipleNameMatches":
    "Plusieurs conducteurs ou propriétaires correspondent — utilisez le téléphone.",
  "agents.multipleNameMatchesNarrow":
    "Plusieurs correspondances — affinez la recherche ou utilisez le téléphone.",
  "agents.floatWalletMissing": "Le portefeuille flottant agent n'est pas configuré",
  "agents.userNotFound": "Utilisateur introuvable (id {userId})",
  "agents.linkedMustBeAgent": "Le compte lié doit être de type agent",
  "agents.portalNoOwnerId": "Les comptes agent portail ne doivent pas avoir ownerId",
  "agents.profileExists": "Cet utilisateur a déjà un profil agent",

  "cards.duplicateCard": "Une carte NFC avec ce jeton ou numéro de série existe déjà",

  "roles.duplicateRole": "Un rôle avec ce nom existe déjà",
  "roles.unknownPermission": "Permission inconnue : {names}",

  "fleet.userNotFound": "Utilisateur introuvable (id {userId})",
  "fleet.assignedMustBeRiderOrOwner": "L'utilisateur affecté doit être conducteur ou propriétaire",
  "fleet.riderWrongOwner": "Le conducteur n'appartient pas à ce propriétaire de moto",
  "fleet.ownerAccountMismatch": "Le compte propriétaire ne correspond pas au propriétaire de la moto",
  "fleet.ridersRequireOwnerId": "Les conducteurs doivent être rattachés à une flotte (ownerId)",
  "fleet.ownerPortalNoOwnerId":
    "Les comptes propriétaire portail ne doivent pas définir ownerId ; liez via Owner.userId",
  "fleet.agentNoOwnerId": "Les comptes agent ne doivent pas avoir ownerId",
  "fleet.onlyRidersOwnerId": "Seuls les conducteurs peuvent avoir ownerId",
  "fleet.riderNoFleetOwner": "Le conducteur n'est pas affecté à un propriétaire de flotte",
  "fleet.ownerWalletMissing": "Portefeuille propriétaire introuvable pour le paiement",

  "validation.failed": "Un ou plusieurs champs sont invalides.",
  "validation.required": "{field} est obligatoire",
  "validation.invalid": "{field} est invalide",
  "validation.isEmail": "{field} doit être une adresse e-mail valide",
  "validation.isIn": "{field} a une valeur non autorisée",
  "validation.isInt": "{field} doit être un entier",
  "validation.isBoolean": "{field} doit être vrai ou faux",
  "validation.isEnum": "{field} a une valeur non autorisée",
  "validation.minLength": "{field} est trop court",
  "validation.maxLength": "{field} est trop long",
  "validation.isString": "{field} doit être du texte",
  "validation.isNumber": "{field} doit être un nombre",
  "validation.min": "{field} est trop petit",
  "validation.max": "{field} est trop grand",
  "validation.whitelistValidation": "{field} n'est pas autorisé",
  "validation.forbidNonWhitelisted": "{field} n'est pas autorisé",
} as const;